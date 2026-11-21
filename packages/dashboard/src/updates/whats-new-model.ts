import type { WhatsNewChange } from "@software-factory/core";

import type { Locale } from "../i18n/locale.ts";

// A change's text split for More: its first sentence, and the rest. A text
// of one sentence has no rest. A full stop inside a word, a number or a
// link does not end a sentence; only one followed by a space does.
export function firstSentence(text: string): { first: string; rest: string } {
  const found = /^(.+?[.!?])\s+(\S[\s\S]*)$/.exec(text.trim());
  return found
    ? { first: found[1] ?? "", rest: found[2] ?? "" }
    : { first: text.trim(), rest: "" };
}

// What a change shows: its first sentence, and the rest behind More.
export function shownChange(change: WhatsNewChange) {
  return { ...change, ...firstSentence(change.text) };
}

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3600],
  ["minute", 60],
];

// "5 minutes ago", "now", "yesterday": a time as a distance from now, in
// the language shown.
export function ago(locale: Locale, iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const words = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of STEPS)
    if (Math.abs(seconds) >= size)
      return words.format(Math.trunc(seconds / size), unit);
  return words.format(0, "second");
}

// Whether a newer release is to be shown: only when it is newer than the
// one this factory runs.
export function showsNewer(
  newest: { version: string } | null,
  current: string,
  compare: (a: string, b: string) => number,
): boolean {
  return newest !== null && compare(newest.version, current) > 0;
}
