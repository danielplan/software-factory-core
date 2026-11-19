import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

// The app's languages. The first is the default, also for a phone set to a
// language the app does not speak. A new language is one more code here and
// one more folder in locales/ (see resources.ts).
export const languages = ['en'] as const;
export type Language = (typeof languages)[number];

export function isLanguage(value: unknown): value is Language {
  return languages.some((language) => language === value);
}

/** The phone's language, when the app speaks it; the first one otherwise. */
export function phoneLanguage(): Language {
  const code = getLocales().at(0)?.languageCode;
  return isLanguage(code) ? code : languages[0];
}

/** The app's translations; react-i18next's hooks use this instance. */
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: phoneLanguage(),
  supportedLngs: languages,
  fallbackLng: languages[0],
  defaultNS: 'common',
  // React already escapes what it shows.
  interpolation: { escapeValue: false },
  // Every text is in the app, so the first screen shows without waiting.
  initAsync: false,
  react: { useSuspense: false },
});
