// Times, dates and numbers as people in the language shown write them.

import type { Locale } from "./locale.ts";

// A time as the clock shows it (14:05, 2:05 PM).
export function clockIn(locale: Locale, iso: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// A day ("19 Nov", "19. Nov.").
export function dayIn(locale: Locale, iso: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}

// A day and a time.
export function momentIn(locale: Locale, iso: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function numberIn(locale: Locale, value: number): string {
  return value.toLocaleString(locale);
}
