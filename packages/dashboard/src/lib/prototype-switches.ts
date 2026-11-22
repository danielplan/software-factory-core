// Prototype only: which variant shows and which made-up state, both chosen
// outside the app by the page address (?variant=B, ?state=docs). The variant
// is kept for the visit, so moving between pages keeps it.

const KEY = "prototype-variant";

export type Variant = "A" | "B" | "C";

export function variantOfVisit(): Variant {
  const asked = new URLSearchParams(window.location.search)
    .get("variant")
    ?.toUpperCase();
  if (asked === "A" || asked === "B" || asked === "C") {
    sessionStorage.setItem(KEY, asked);
    return asked;
  }
  const kept = sessionStorage.getItem(KEY);
  return kept === "B" || kept === "C" ? kept : "A";
}

export function stateOfVisit(): string | null {
  return new URLSearchParams(window.location.search).get("state");
}
