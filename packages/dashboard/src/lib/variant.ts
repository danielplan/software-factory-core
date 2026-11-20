// Prototype: which way of a change shows, chosen by the page address
// (?variant=B), read once when the app loads and kept for the visit, so
// moving between pages keeps it. The first one without it.

const VARIANTS = ["A", "B", "C"] as const;
export type Variant = (typeof VARIANTS)[number];

const KEY = "prototype-variant";

function readVariant(): Variant {
  const asked = new URLSearchParams(window.location.search)
    .get("variant")
    ?.toUpperCase();
  const known = VARIANTS.find((one) => one === asked);
  if (known) {
    sessionStorage.setItem(KEY, known);
    return known;
  }
  const kept = sessionStorage.getItem(KEY);
  return VARIANTS.find((one) => one === kept) ?? VARIANTS[0];
}

export const VARIANT: Variant = readVariant();
