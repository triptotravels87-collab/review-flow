import { ApiError, GoogleGenAI, ThinkingLevel, type ThinkingConfig } from "@google/genai";
import { serverEnv } from "./env";
import {
  buildUserPrompt,
  DraftParseError,
  parseDraftsResponse,
  SYSTEM_PROMPT,
  type GenerateDraftsInput,
  type PromptBusiness,
} from "./drafts";

let client: GoogleGenAI | null = null;
function gemini() {
  client ??= new GoogleGenAI({ apiKey: serverEnv().GEMINI_API_KEY });
  return client;
}

const TOTAL_BUDGET_MS = 8_000; // Vercel Hobby functions stop at ~10s
const MIN_RETRY_MS = 2_500;
/** "High demand" / overload responses that usually succeed on an immediate retry. */
const TRANSIENT_STATUSES = new Set([500, 503, 504]);

/** JSON Schema the model's output is constrained to (we still validate with Zod). */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    drafts: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
  },
  required: ["drafts"],
  additionalProperties: false,
};

/**
 * Keep thinking as small as the model allows: this is a short JSON task, and
 * thinking tokens add latency and count against the output-token limit.
 */
function thinkingConfig(model: string): ThinkingConfig | undefined {
  if (/^gemini-2\.5-flash/.test(model)) return { thinkingBudget: 0 };
  // Flash-Lite accepts MINIMAL (fastest). Other 3.x models (e.g. gemini-3.8-flash) reject it; LOW works on all.
  if (/^gemini-[3-9][.\d]*-flash-lite/.test(model)) return { thinkingLevel: ThinkingLevel.MINIMAL };
  if (/^gemini-[3-9]/.test(model)) return { thinkingLevel: ThinkingLevel.LOW };
  return undefined;
}

async function callOnce(userPrompt: string, timeoutMs: number): Promise<string> {
  const model = serverEnv().GEMINI_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await gemini().models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        thinkingConfig: thinkingConfig(model),
        abortSignal: controller.signal,
      },
    });
    const reason = res.candidates?.[0]?.finishReason;
    const text = res.text;
    if (!text) throw new DraftParseError(`empty response (finishReason: ${reason ?? "none"})`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export class DraftGenerationError extends Error {}

/** Generate 3 drafts; retries once on an unparseable reply if time allows. */
export async function generateDrafts(input: GenerateDraftsInput, business: PromptBusiness): Promise<string[]> {
  const prompt = buildUserPrompt(input, business);
  const deadline = Date.now() + TOTAL_BUDGET_MS;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 1 && remaining < MIN_RETRY_MS) break;
    try {
      const text = await callOnce(prompt, remaining);
      return parseDraftsResponse(text);
    } catch (err) {
      if (err instanceof DraftParseError) {
        console.warn(`generateDrafts: parse failure on attempt ${attempt}: ${err.message}`);
        continue; // retry once
      }
      if (err instanceof ApiError && TRANSIENT_STATUSES.has(err.status) && attempt === 1) {
        console.warn(`generateDrafts: transient Gemini error ${err.status}, retrying once`);
        continue;
      }
      if (err instanceof ApiError) {
        console.error(`generateDrafts: Gemini API error ${err.status}: ${err.message}`);
      } else if (err instanceof Error && err.name === "AbortError") {
        console.error("generateDrafts: Gemini request timed out");
      } else {
        console.error("generateDrafts: unexpected error", err);
      }
      throw new DraftGenerationError("upstream failure");
    }
  }
  throw new DraftGenerationError("could not parse model output");
}
