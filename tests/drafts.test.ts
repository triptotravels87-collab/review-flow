import { describe, expect, it } from "vitest";
import { buildUserPrompt, DraftParseError, GenerateDraftsInput, parseDraftsResponse } from "@/lib/drafts";

const d1 = "The coffee here was lovely and the staff were warm and welcoming from the moment we walked in.";
const d2 = "Quick service, clean tables and a relaxed vibe. A nice spot to sit with a book for an hour or two.";
const d3 = "Really enjoyed my visit. Everything felt fresh and the place was spotless. Will definitely come back soon.";
const valid = JSON.stringify({ drafts: [d1, d2, d3] });

describe("parseDraftsResponse", () => {
  it("parses valid JSON", () => {
    expect(parseDraftsResponse(valid)).toEqual([d1, d2, d3]);
  });

  it("parses markdown-wrapped JSON", () => {
    expect(parseDraftsResponse("```json\n" + valid + "\n```")).toEqual([d1, d2, d3]);
    expect(parseDraftsResponse("```\n" + valid + "\n```")).toEqual([d1, d2, d3]);
  });

  it("tolerates chatter around the JSON object", () => {
    expect(parseDraftsResponse(`Sure! Here you go:\n${valid}\nHope that helps.`)).toHaveLength(3);
  });

  it("strips hashtags and trims", () => {
    const out = parseDraftsResponse(JSON.stringify({ drafts: [`  ${d1} #cafe #bestcoffee `, d2, d3] }));
    expect(out[0]).toBe(d1);
  });

  it("rejects non-JSON", () => {
    expect(() => parseDraftsResponse("I can't help with that.")).toThrow(DraftParseError);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseDraftsResponse('{"drafts": ["a", "b",]}')).toThrow(DraftParseError);
  });

  it("rejects the wrong number of drafts", () => {
    expect(() => parseDraftsResponse(JSON.stringify({ drafts: [d1, d2] }))).toThrow(/exactly 3/);
    expect(() => parseDraftsResponse(JSON.stringify({ drafts: [d1, d2, d3, d1] }))).toThrow(DraftParseError);
  });

  it("rejects wrong shapes and empty drafts", () => {
    expect(() => parseDraftsResponse(JSON.stringify({ reviews: [d1, d2, d3] }))).toThrow(DraftParseError);
    expect(() => parseDraftsResponse(JSON.stringify({ drafts: [d1, d2, 42] }))).toThrow(DraftParseError);
    expect(() => parseDraftsResponse(JSON.stringify({ drafts: [d1, d2, "  "] }))).toThrow(DraftParseError);
  });
});

describe("GenerateDraftsInput", () => {
  it("accepts a valid request and defaults highlights", () => {
    const r = GenerateDraftsInput.parse({ rating: 4, language: "hinglish" });
    expect(r.highlights).toEqual([]);
  });

  it("rejects bad ratings, languages and too many highlights", () => {
    expect(GenerateDraftsInput.safeParse({ rating: 0, language: "en" }).success).toBe(false);
    expect(GenerateDraftsInput.safeParse({ rating: 6, language: "en" }).success).toBe(false);
    expect(GenerateDraftsInput.safeParse({ rating: 3, language: "fr" }).success).toBe(false);
    expect(
      GenerateDraftsInput.safeParse({ rating: 3, language: "en", highlights: ["a", "b", "c", "d", "e", "f"] }).success,
    ).toBe(false);
  });
});

describe("buildUserPrompt", () => {
  it("includes rating, language script and business details", () => {
    const p = buildUserPrompt(
      { rating: 2, language: "hinglish", highlights: ["Speed"], staffName: "Priya" },
      { name: "Sunrise Cafe", category: "Cafe", city: "Pune", keywords: ["cozy cafe"] },
    );
    expect(p).toContain("2 out of 5");
    expect(p).toContain("Roman/Latin");
    expect(p).toContain("Sunrise Cafe (Cafe, Pune)");
    expect(p).toContain("Priya");
    expect(p).toContain("cozy cafe");
  });
});
