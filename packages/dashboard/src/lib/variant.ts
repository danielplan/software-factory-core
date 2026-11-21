// PROTOTYPE: which variant of the prototype shows, chosen by the page
// address (?variant=F), kept for the visit; the first without it.

const VARIANTS = ["E", "F"] as const;
export type Variant = (typeof VARIANTS)[number];

const KEY = "prototype-variant";

const known = (value: string | null | undefined): value is Variant =>
  VARIANTS.includes(value as Variant);

function read(): Variant {
  const asked = new URLSearchParams(location.search)
    .get("variant")
    ?.toUpperCase();
  if (known(asked)) {
    sessionStorage.setItem(KEY, asked);
    return asked;
  }
  const kept = sessionStorage.getItem(KEY);
  return known(kept) ? kept : VARIANTS[0];
}

export const VARIANT: Variant = read();
