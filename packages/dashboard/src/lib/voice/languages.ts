// The languages the owner can talk to the coach in, and what the voice needs
// for each: its name, Whisper's token for it, the Piper voice that says the
// coach's answers, the natural voices of Microsoft Edge to fall back on, and
// what is said when the coach sent nothing to say. Adding a language here
// is enough for the whole voice to use it.

export const LANGUAGES = {
  en: {
    name: "English",
    piper: "en_US-hfc_female-medium",
    natural: ["Ava", "Aria", "Jenny", "Emma", "Andrew", "Guy", "Brian"],
    nothingToSay:
      "Sorry, I have no spoken answer this time. Please say it again.",
  },
  de: {
    name: "Deutsch",
    piper: "de_DE-thorsten-medium",
    natural: ["Katja", "Amala", "Seraphina", "Conrad", "Florian", "Killian"],
    nothingToSay:
      "Entschuldigung, diesmal habe ich keine gesprochene Antwort. Sag es bitte noch einmal.",
  },
  it: {
    name: "Italiano",
    piper: "it_IT-serena-medium",
    natural: ["Isabella", "Elsa", "Diego", "Giuseppe"],
    nothingToSay:
      "Scusa, questa volta non ho una risposta a voce. Ripetilo, per favore.",
  },
  fr: {
    name: "Français",
    piper: "fr_FR-siwis-medium",
    natural: ["Denise", "Vivienne", "Eloise", "Henri", "Remy"],
    nothingToSay:
      "Désolé, je n'ai pas de réponse à voix haute cette fois. Peux-tu le redire ?",
  },
  es: {
    name: "Español",
    piper: "es_ES-davefx-medium",
    natural: ["Elvira", "Ximena", "Alvaro"],
    nothingToSay:
      "Lo siento, esta vez no tengo respuesta hablada. Dilo otra vez, por favor.",
  },
} as const;

export type Language = keyof typeof LANGUAGES;

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as Language[];

export function isLanguage(code: string): code is Language {
  return code in LANGUAGES;
}

// The language of this browser when the voice knows it, else English.
export function browserLanguage(code: string): Language {
  const short = code.slice(0, 2).toLowerCase();
  return isLanguage(short) ? short : "en";
}
