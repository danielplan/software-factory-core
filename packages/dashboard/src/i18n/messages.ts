// The words through i18next: one instance for the page, set up at once
// (the resources are bundled, so nothing waits), and English for the parts
// worked out outside the page and their tests. The language shown is
// changed by the LanguageProvider (use-t.tsx).

import i18next, { type TFunction } from "i18next";

import type { Locale } from "./locale.ts";
import { resources } from "./resources.ts";

export const i18n = i18next.createInstance();

void i18n.init({
  resources,
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "it", "de"],
  // The resources are bundled: ready before the first screen.
  initAsync: false,
  // React escapes what it shows.
  interpolation: { escapeValue: false },
  // Keys are "area.key"; some keys hold a colon or a space, never a dot.
  nsSeparator: false,
  returnNull: false,
});

// "{{label, lowercase}}": a name in lower case, as the language writes it.
i18n.services.formatter?.add("lowercase", (value: unknown, lng?: string) =>
  String(value).toLocaleLowerCase(lng),
);

// The shape of the words, for types that name their keys.
export type Messages = (typeof resources)["en"]["translation"];

// The words in one language, outside React.
export function messagesIn(locale: Locale): TFunction {
  return i18n.getFixedT(locale);
}

// English, for the parts worked out outside the page (and their tests).
export const ENGLISH = messagesIn("en");
