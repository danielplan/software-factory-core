// One area's words in every language: English first, as the source; the
// others must have every key English has, with the same kind of value (a
// text, or a function that makes one), or the types refuse them.

import type { Locale } from "./locale.ts";

export function area<T>(
  en: T,
  it: NoInfer<T>,
  de: NoInfer<T>,
): Record<Locale, T> {
  return { en, it, de };
}
