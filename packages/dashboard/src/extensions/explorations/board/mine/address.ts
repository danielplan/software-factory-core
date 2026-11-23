// A web address as the board takes it: what was copied, dragged or typed
// that is one, and how a link card shows it.

// What was pasted or dragged as an address: a whole one, with http(s) in
// front (so a file's name is not taken for one). Null when it is not one.
export function addressOf(text: string): string | null {
  const typed = text.trim();
  if (!/^https?:\/\/\S+$/i.test(typed)) return null;
  try {
    const url = new URL(typed);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

// What was typed in the link box: the same, with or without http(s).
export function typedAddress(text: string): string | null {
  const typed = text.trim();
  if (!typed || /\s/.test(typed)) return null;
  return addressOf(/^https?:\/\//i.test(typed) ? typed : `https://${typed}`);
}

// The address as it reads on the card, without "https://".
export function shownOf(address: string): string {
  const url = new URL(address);
  const path = url.pathname === "/" ? "" : url.pathname;
  return `${url.hostname.replace(/^www\./, "")}${path}${url.search}`;
}

// A colour for a site's letter icon, worked out from its name.
export function hueOf(site: string): number {
  let hue = 0;
  for (const c of site) hue = (hue * 31 + c.charCodeAt(0)) % 360;
  return hue;
}
