export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi (हिन्दी)" },
  { code: "hinglish", label: "Hinglish" },
  { code: "ta", label: "Tamil (தமிழ்)" },
  { code: "bn", label: "Bengali (বাংলা)" },
  { code: "mr", label: "Marathi (मराठी)" },
  { code: "te", label: "Telugu (తెలుగు)" },
  { code: "gu", label: "Gujarati (ગુજરાતી)" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

/** How each language is described to the LLM (including script). */
export const LANGUAGE_PROMPT: Record<LanguageCode, string> = {
  en: "English",
  hi: "Hindi, written in Devanagari script",
  hinglish:
    "Hinglish: conversational Hindi mixed with English, written ONLY in Roman/Latin letters (no Devanagari)",
  ta: "Tamil, written in Tamil script",
  bn: "Bengali, written in Bengali script",
  mr: "Marathi, written in Devanagari script",
  te: "Telugu, written in Telugu script",
  gu: "Gujarati, written in Gujarati script",
};

export const GENERIC_HIGHLIGHTS = ["Cleanliness", "Speed", "Value for money", "Friendly staff", "Ambience"];
export const MAX_HIGHLIGHTS = 5;

export const EVENT_TYPES = [
  "SCAN",
  "DRAFTS_VIEWED",
  "DRAFT_COPIED",
  "GOOGLE_REDIRECT",
  "PRIVATE_CONTACT",
] as const;
export type EventTypeName = (typeof EVENT_TYPES)[number];

export const SESSION_COOKIE = "rf_admin";
