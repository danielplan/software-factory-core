// Which variant of this prototype shows, chosen outside the app by the page
// address (?variant=B; B without it), kept for the visit. ?state= picks a
// made-up state of the start box (read once, when the app loads).

function fromAddress(name: string): string | null {
  const value = new URLSearchParams(window.location.search).get(name);
  if (value) sessionStorage.setItem(`prototype-${name}`, value);
  return value ?? sessionStorage.getItem(`prototype-${name}`);
}

export const VARIANT = (fromAddress("variant") ?? "B").toUpperCase();

export const STATE = new URLSearchParams(window.location.search).get("state");
