import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources } from "@/i18n/resources";

// The app's languages; the first is the default. The app speaks English
// only: a new language is a folder in locales/, an entry in resources.ts and
// its name here (and, with more than one, a language switch and the
// browser's language detection).
export const languages = ["en"] as const;
export type Language = (typeof languages)[number];

function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value);
}

// The active language, as one of the app's languages.
export function activeLanguage(): Language {
  const language = i18n.resolvedLanguage;
  return isLanguage(language) ? language : "en";
}

// The page follows the language: <html lang> for screen readers and the
// browser's own words, and the title in the tab.
i18n.on("languageChanged", () => {
  document.documentElement.lang = activeLanguage();
  document.title = i18n.t("app:pageTitle");
});

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  supportedLngs: languages,
  fallbackLng: "en",
  defaultNS: "app",
  // React already escapes what it shows.
  interpolation: { escapeValue: false },
  // Everything is bundled, so the first page shows in the right language
  // without waiting.
  initAsync: false,
  react: { useSuspense: false },
});

export { i18n };
