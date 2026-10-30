// On-screen text per language: the v1.0 English lines (plain words, based on the National Crisis Centre's flood
// advice, crisiscenter.be / centredecrise.be / crisiscentrum.be / krisenzentrum.be, opened 29 Oct 2026), translated
// into FR/NL/DE with the Centre's own vocabulary where it fits. Not word for word: the source line says "based on".
// FR/NL/DE: a native speaker in the team checks them before the demo (safety message).
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
    source: "Based on National Crisis Centre advice (crisiscenter.be)",
  },
  fr: {
    breathe: ["Respirez.", "Voici l'essentiel."],
    call: ["Une vie en danger ?", "Appelez le 112"],
    water: ["Restez loin", "de l'eau qui coule vite"],
    cut: ["Coupez le gaz, l'électricité", "et l'eau si nécessaire"],
    evacuate: ["On vous dit d'évacuer ?", "Suivez les services de secours"],
    guide: ["Votre commune et BE-Alert", "vous guident. Vous n'êtes pas seuls."],
    source: "D'après le Centre de Crise National (centredecrise.be)",
  },
  nl: {
    breathe: ["Adem rustig.", "Dit is wat telt."],
    call: ["Iemand in levensgevaar?", "Bel 112"],
    water: ["Blijf weg van", "snelstromend water"],
    cut: ["Sluit gas, elektriciteit", "en water af indien nodig"],
    evacuate: ["Moet je evacueren?", "Volg de hulpdiensten"],
    guide: ["Je gemeente en BE-Alert", "helpen je. Je staat er niet alleen voor."],
    source: "Op basis van het Nationaal Crisiscentrum (crisiscentrum.be)",
  },
  de: {
    breathe: ["Atmen Sie durch.", "Das ist jetzt wichtig."],
    call: ["Lebensgefahr?", "Rufen Sie die 112 an"],
    water: ["Halten Sie Abstand", "von schnell fließendem Wasser"],
    cut: ["Schalten Sie Gas, Strom", "und Wasser ab, wenn nötig"],
    evacuate: ["Evakuierung angeordnet?", "Folgen Sie den Rettungsdiensten"],
    guide: ["Ihre Gemeinde und BE-Alert", "helfen Ihnen. Sie sind nicht allein."],
    source: "Nach dem Nationalen Krisenzentrum (krisenzentrum.be)",
  },
};
