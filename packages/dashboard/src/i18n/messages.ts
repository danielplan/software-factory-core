// Every area's words, put together per language. Add an area here once
// its file is written (areas/<area>.ts).

import type { Locale } from "./locale.ts";
import { voice } from "./areas/voice.ts";
import { setup } from "./areas/setup-area.ts";
import { support } from "./areas/support.ts";
import { connect } from "./areas/connect.ts";
import { factory } from "./areas/factory.ts";
import { explore } from "./areas/explore-area.ts";
import { personas } from "./areas/personas.ts";
import { shell } from "./areas/shell.ts";
import { home } from "./areas/home.ts";
import { settings } from "./areas/settings.ts";
import { signals } from "./areas/signals.ts";
import { system } from "./areas/system.ts";
import { updates } from "./areas/updates.ts";
import { whatsNew } from "./areas/whats-new.ts";
import { words } from "./areas/words.ts";
import { builder } from "./areas/builder.ts";
import { feedback } from "./areas/feedback.ts";
import { chat } from "./areas/chat.ts";
import { releases } from "./areas/releases.ts";
import { market } from "./areas/market.ts";

const AREAS = {
  shell,
  home,
  system,
  updates,
  whatsNew,
  settings,
  words,
  signals,
  personas,
  explore,
  factory,
  releases,
  market,
  builder,
  feedback,
  connect,
  support,
  chat,
  setup,
  voice,
};

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
