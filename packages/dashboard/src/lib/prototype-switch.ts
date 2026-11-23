// Prototype only: which variant and which made-up state the page address
// asks for (`?variant=B&state=stopped`). Read when the page loads and kept for
// the visit (sessionStorage), so moving between pages keeps it. Nothing in
// the app shows or switches them.

function read(name: string, fallback: string): string {
  const key = `prototype-${name}`;
  const asked = new URLSearchParams(location.search).get(name);
  if (asked) sessionStorage.setItem(key, asked);
  return sessionStorage.getItem(key) ?? fallback;
}

export const variantAsked = (): string => read("variant", "B").toUpperCase();

// The made-up state to show ("usual" without one).
export const stateAsked = (): string => read("state", "usual").toLowerCase();
