// Pure helpers (no I/O) for the draft-generation feature, so they are unit-testable.
import { z } from "zod";
import { LANGUAGE_CODES, LANGUAGE_PROMPT, MAX_HIGHLIGHTS, type LanguageCode } from "./constants";

export const GenerateDraftsInput = z.object({
  rating: z.number().int().min(1).max(5),
  highlights: z.array(z.string().trim().min(1).max(60)).max(MAX_HIGHLIGHTS).default([]),
  language: z.enum(LANGUAGE_CODES),
  staffName: z.string().trim().min(1).max(60).optional(),
});
export type GenerateDraftsInput = z.infer<typeof GenerateDraftsInput>;

/** Shape we require back from the LLM. Word counts are guided by the prompt;
 *  here we only enforce sane character bounds (word counts vary by script). */
export const DraftsOutput = z.object({
  drafts: z
    .array(z.string().trim().min(20, "draft too short").max(700, "draft too long"))
    .length(3, "expected exactly 3 drafts"),
});
export type DraftsOutput = z.infer<typeof DraftsOutput>;

export class DraftParseError extends Error {}

/**
 * Parse raw LLM text into 3 drafts. Tolerates markdown code fences and
 * leading/trailing chatter around the JSON object.
 */
export function parseDraftsResponse(raw: string): string[] {
  let text = raw.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence) text = fence[1]!.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new DraftParseError("no JSON object found");

  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new DraftParseError("invalid JSON");
  }
  const result = DraftsOutput.safeParse(json);
  if (!result.success) throw new DraftParseError(result.error.issues.map((i) => i.message).join("; "));
  return result.data.drafts.map(stripHashtags);
}

function stripHashtags(s: string): string {
  return s.replace(/(^|\s)#[\p{L}\p{N}_]+/gu, "$1").replace(/\s{2,}/g, " ").trim();
}

export interface PromptBusiness {
  name: string;
  category: string;
  city: string;
  keywords: string[];
}

export const SYSTEM_PROMPT = `You write short draft Google reviews that a real customer will edit and post themselves.

Output rules (follow exactly):
- Return ONLY valid JSON of the form {"drafts":["...","...","..."]}. No markdown, no code fences, no commentary.
- Exactly 3 drafts. Each draft is 25-60 words.
- Make them sound natural and human. Each draft uses a different tone (e.g. warm, matter-of-fact, brief and casual) and a different sentence structure and opening.
- Match the sentiment of the star rating honestly:
  - 5 stars: genuinely positive.
  - 4 stars: positive with at most a light note of something that could be better.
  - 3 stars: mixed and balanced; name what was fine and what could improve.
  - 1-2 stars: honest, constructive criticism, calm and specific to the points given. Do NOT write praise.
- Never invent specific facts that were not provided: no prices, dates, dish or product names, people's names, wait times or numbers.
- Only mention a staff member if a staff name is provided.
- You may use at most 1-2 of the listed keywords, only where they read naturally. Never stuff keywords; it is fine to use none.
- Write in the requested language and script.
- No hashtags. At most one emoji per draft (zero is fine).
- Write in first person as the customer. Do not mention AI, drafts, or that you were asked to write this.`;

export function buildUserPrompt(input: GenerateDraftsInput, b: PromptBusiness): string {
  const lang = LANGUAGE_PROMPT[input.language as LanguageCode];
  const lines = [
    `Business: ${b.name} (${b.category}${b.city ? `, ${b.city}` : ""})`,
    `Star rating given by the customer: ${input.rating} out of 5`,
    `Things the customer chose to highlight: ${input.highlights.length ? input.highlights.join(", ") : "(none, keep it general)"}`,
    `Staff member to mention: ${input.staffName ?? "(none)"}`,
    `Optional keywords: ${b.keywords.length ? b.keywords.join(", ") : "(none)"}`,
    `Language: ${lang}`,
    "",
    'Return {"drafts":[...]} with exactly 3 drafts.',
  ];
  return lines.join("\n");
}
