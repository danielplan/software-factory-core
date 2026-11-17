// The dashboard's language: one of these, chosen in Settings and kept in
// this browser; else the browser's own, when it is one of them; else English.

export const LANGUAGES = [
  { id: "en", name: "English" },
  { id: "it", name: "Italiano" },
  { id: "de", name: "Deutsch" },
  { id: "fr", name: "Français" },
  { id: "es", name: "Español" },
] as const;
export type Language = (typeof LANGUAGES)[number]["id"];

const KEY = "kobble-language";

const known = (code: string | null | undefined): Language | null =>
  LANGUAGES.find((one) => one.id === code?.slice(0, 2).toLowerCase())?.id ??
  null;

// The kept choice first, then the browser's languages in its order.
export function languageOf(
  stored: string | null,
  browser: readonly string[],
): Language {
  return known(stored) ?? browser.map(known).find(Boolean) ?? "en";
}

// What this browser kept; nothing when it keeps nothing (a private window).
export function storedLanguage(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function keepLanguage(language: Language): void {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    // Kept for this visit only.
  }
}
