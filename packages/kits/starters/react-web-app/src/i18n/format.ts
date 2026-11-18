import { activeLanguage, type Language } from "@/i18n/i18n";

// Dates in the active language, on the browser's Intl, in the browser's own
// time zone. Add numbers, money and sorting here when the app needs them.

// English uses the British conventions (day before month, 24-hour clock).
const locales: Record<Language, string> = { en: "en-GB" };

const days = new Map<Language, Intl.DateTimeFormat>();

export function formatDay(date: Date): string {
  const language = activeLanguage();
  let format = days.get(language);
  if (!format) {
    format = new Intl.DateTimeFormat(locales[language], {
      dateStyle: "medium",
    });
    days.set(language, format);
  }
  return format.format(date);
}
