// Where a prototype's card keeps its variant and data switches (prototype
// A, B or C of "A calm prototype card"): chosen outside the app, by the
// page address (?variant=B), read when the page loads and kept for the
// visit, so moving between pages keeps it. Nothing on the page switches it.

export type Layout = "A" | "B" | "C";

const KEY = "kobble.prototype-card-layout";

function isLayout(value: string | null | undefined): value is Layout {
  return value === "A" || value === "B" || value === "C";
}

function readLayout(): Layout {
  if (typeof window === "undefined") return "A";
  const asked = new URLSearchParams(window.location.search)
    .get("variant")
    ?.toUpperCase();
  try {
    if (isLayout(asked)) {
      sessionStorage.setItem(KEY, asked);
      return asked;
    }
    const kept = sessionStorage.getItem(KEY);
    if (isLayout(kept)) return kept;
  } catch {
    // Storage may be off: the address alone decides.
  }
  return isLayout(asked) ? asked : "A";
}

let read: Layout | null = null;

export function layoutOf(): Layout {
  read ??= readLayout();
  return read;
}
