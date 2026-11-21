// Times and dates as people in the language shown write them.

import type { Locale } from "./locale.ts";

// A time as the clock shows it (14:05, 2:05 PM).
export function clockIn(locale: Locale, iso: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
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

// A day, as people in the language shown write it.
export function dayIn(locale: Locale, iso: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
