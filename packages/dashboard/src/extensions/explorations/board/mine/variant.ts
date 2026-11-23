// Prototype switches, chosen outside the app by the page address and kept
// for the visit (sessionStorage): ?variant=A|B says how a new drawing starts,
// ?state=empty shows the board with no things on it. Nothing in the app shows or switches them.

function chosen(name: string): string | null {
  try {
    const asked = new URLSearchParams(window.location.search).get(name);
    if (asked) sessionStorage.setItem(name, asked);
    return sessionStorage.getItem(name);
  } catch {
    return null;
  }
}

// How a new drawing starts: A, a stroke on empty space opens a sketch card
// around it; B, the Sketch tool places an empty sketch card first.
export type StartVariant = "A" | "B";

export function startVariant(): StartVariant {
  return chosen("variant")?.toUpperCase() === "B" ? "B" : "A";
}

export function boardState(): "usual" | "empty" {
  return chosen("state") === "empty" ? "empty" : "usual";
}
