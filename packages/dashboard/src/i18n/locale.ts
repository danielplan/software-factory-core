// The languages Kobble speaks, and which one a computer uses: the owner's
// choice (Settings › Language, kept per computer), or the browser's when
// they leave it to the browser; English for any other language.

export const LOCALES = ["en", "it", "de"] as const;
export type Locale = (typeof LOCALES)[number];

// What the owner chose: one of the languages, or the browser's.
export type LanguageChoice = Locale | "browser";
export const CHOICES: LanguageChoice[] = ["browser", "en", "it", "de"];

// Each language in its own words, for the choice.
export const OWN_NAME: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
};

// A language as a browser names it ("it-CH", "de"), when Kobble speaks it.
function spoken(asked: string): Locale | null {
  const code = asked.toLowerCase().slice(0, 2);
  return LOCALES.find((one) => one === code) ?? null;
}

// The language to show: the one chosen, or the browser's first one that
// Kobble speaks; English otherwise.
export function chosenLocale(
  choice: LanguageChoice,
  browser: readonly string[],
): Locale {
  if (choice !== "browser") return choice;
  for (const asked of browser) {
    const found = spoken(asked);
    if (found) return found;
  }
  return "en";
}

export function isChoice(value: unknown): value is LanguageChoice {
  return CHOICES.some((one) => one === value);
}
