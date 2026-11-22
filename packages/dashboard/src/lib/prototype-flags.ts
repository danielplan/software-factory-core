// Prototype only: which variant of the extensions page shows, chosen outside the
// app by the page address (?variant=B), kept for the visit; and the made-up
// state Home shows (?state=empty | many).

export type Variant = "A" | "B" | "C";

const KEY = "kobble.variant";

function readVariant(): Variant {
  const asked = new URLSearchParams(window.location.search).get("variant");
  const kept = sessionStorage.getItem(KEY);
  const wanted = (asked ?? kept ?? "A").toUpperCase();
  const variant = wanted === "B" || wanted === "C" ? wanted : "A";
  sessionStorage.setItem(KEY, variant);
  return variant;
}

export const VARIANT: Variant = readVariant();

export type MadeState = "usual" | "empty" | "many";

function readState(): MadeState {
  const asked = new URLSearchParams(window.location.search).get("state");
  return asked === "empty" || asked === "many" ? asked : "usual";
}

export const MADE_STATE: MadeState = readState();
