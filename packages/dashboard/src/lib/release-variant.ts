// Prototype: which way of making and seeing releases shows. Chosen by the
// page address (?variant=B), kept for the visit; the first one without it.

export type ReleaseVariant = "A" | "B";

export function releaseVariant(): ReleaseVariant {
  const asked = new URLSearchParams(window.location.search)
    .get("variant")
    ?.toUpperCase();
  if (asked === "A" || asked === "B") sessionStorage.setItem("variant", asked);
  return sessionStorage.getItem("variant") === "B" ? "B" : "A";
}
