import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The theme's own type sizes (--text-* in theme.css). tailwind-merge knows
// only Tailwind's: without this list it reads `text-body` as a colour and
// drops it when a colour class follows. A new size goes here too; the tests
// compare the list with theme.css.
export const textSizes = [
  "fine",
  "caption",
  "note",
  "body",
  "subtitle",
  "figure",
  "title-phone",
  "title",
  "metric",
];

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: textSizes }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
