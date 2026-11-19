// Every area's words, put together per language. Add an area here once
// its file is written (areas/<area>.ts).

import type { Locale } from "./locale.ts";
import { shell } from "./areas/shell.ts";
import { home } from "./areas/home.ts";
import { settings } from "./areas/settings.ts";
import { system } from "./areas/system.ts";
import { updates } from "./areas/updates.ts";

const AREAS = { shell, home, system, updates, settings };

type Areas = typeof AREAS;
export type Messages = { [K in keyof Areas]: Areas[K]["en"] };

function messagesOf(locale: Locale): Messages {
  const entries = Object.entries(AREAS).map(([name, words]) => [
    name,
    words[locale],
  ]);
  return Object.fromEntries(entries) as Messages;
}

const ALL: Record<Locale, Messages> = {
  en: messagesOf("en"),
  it: messagesOf("it"),
  de: messagesOf("de"),
};

export function messagesIn(locale: Locale): Messages {
  return ALL[locale];
}

// English, for the parts worked out outside the page (and their tests).
export const ENGLISH = ALL.en;
