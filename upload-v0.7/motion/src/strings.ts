// On-screen text per language. Wording: National Crisis Centre, "Inondation pluviale" page
// (centredecrise.be, accessed 29 Oct 2026), in plain words.
// Only languages with text are rendered and offered in the app: FR/NL/DE stay empty until a
// native speaker has written or checked them (no unchecked machine translation in a safety message).
export type Lang = "en" | "fr" | "nl" | "de";

export type Strings = {
  breathe: [string, string];
  call: [string, string];
  water: [string, string];
  cut: [string, string];
  evacuate: [string, string];
  guide: [string, string];
  source: string;
};

export const STRINGS: Record<Lang, Strings | null> = {
  en: {
    breathe: ["Take a breath.", "Here's what matters."],
    call: ["Life in danger?", "Call 112"],
    water: ["Stay away from", "fast-flowing water"],
    cut: ["Cut gas, electricity", "and water if needed"],
    evacuate: ["Told to evacuate?", "Follow the emergency services"],
    guide: ["Your municipality and BE-Alert", "will guide you. You're not alone."],
    source: "Advice: National Crisis Centre (centredecrise.be)",
  },
  fr: null,
  nl: null,
  de: null,
};
