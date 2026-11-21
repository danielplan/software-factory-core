// Which variant of the prototype shows: chosen by the page address
// (?variant=B), kept for the visit. A when none is asked.
export type Variant = "A" | "B" | "C";

export function variant(): Variant {
  const asked = new URLSearchParams(window.location.search).get("variant");
  if (asked === "A" || asked === "B" || asked === "C") {
    sessionStorage.setItem("variant", asked);
    return asked;
  }
  const kept = sessionStorage.getItem("variant");
  return kept === "B" || kept === "C" ? kept : "A";
}
