// Prototype: which way of letting something new into the factory shows,
// chosen by the page address (?variant=B; A without it) and kept for the
// visit, so moving between pages keeps it.

export type Variant = "A" | "B" | "C";

const KEY = "prototype-variant";
const ALL: readonly Variant[] = ["A", "B", "C"];

function asVariant(value: string | null): Variant | null {
  const upper = value?.toUpperCase() ?? null;
  return ALL.find((one) => one === upper) ?? null;
}

// Read once, when the app loads.
export function keepVariant(): void {
  const asked = asVariant(new URLSearchParams(window.location.search).get("variant"));
  if (asked) sessionStorage.setItem(KEY, asked);
}

export function variant(): Variant {
  return asVariant(sessionStorage.getItem(KEY)) ?? "A";
}
