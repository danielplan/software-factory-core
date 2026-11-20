// Which variant of the prototype shows, chosen outside the app by the page
// address (?variant=B; A without it). Read once when the app loads and kept
// for the visit, so moving between pages keeps it. Nothing in the app shows
// or switches it.

const KEY = "prototype-variant";

function chosen(): "A" | "B" {
  const asked = new URLSearchParams(window.location.search)
    .get("variant")
    ?.toUpperCase();
  if (asked === "A" || asked === "B") {
    sessionStorage.setItem(KEY, asked);
    return asked;
  }
  return sessionStorage.getItem(KEY) === "B" ? "B" : "A";
}

export const VARIANT = chosen();
