// Prototype switches, chosen outside the app by the page address and kept
// for the visit (sessionStorage): ?variant=A|B says where the add toolbar
// sits (A at the bottom, B top-left), ?state=empty shows the board with no
// things on it. Nothing in the app shows or switches them.

function chosen(name: string): string | null {
  try {
    const asked = new URLSearchParams(window.location.search).get(name);
    if (asked) sessionStorage.setItem(name, asked);
    return sessionStorage.getItem(name);
  } catch {
    return null;
  }
}

export type ToolbarVariant = "A" | "B";

export function toolbarVariant(): ToolbarVariant {
  return chosen("variant")?.toUpperCase() === "B" ? "B" : "A";
}

export function boardState(): "usual" | "empty" {
  return chosen("state") === "empty" ? "empty" : "usual";
}
