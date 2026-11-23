// A web address and its made-up preview: no page is fetched; the title,
// site and small picture are worked out from the address itself.

export type Preview = { site: string; title: string; hue: number };

// What a person typed or pasted as an address, or null when it is not one.
export function addressOf(text: string): string | null {
  const typed = text.trim();
  if (!typed || /\s/.test(typed)) return null;
  const full = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`;
  try {
    const url = new URL(full);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

export function previewOf(address: string): Preview {
  const url = new URL(address);
  const site = url.hostname.replace(/^www\./, "");
  const last = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const words = decodeURIComponent(last)
    .replace(/\.\w{2,4}$/, "")
    .replace(/[-_+]+/g, " ")
    .trim();
  const name = site.split(".")[0] ?? site;
  const title = (words || name).replace(/^./, (c) => c.toUpperCase());
  let hue = 0;
  for (const c of site) hue = (hue * 31 + c.charCodeAt(0)) % 360;
  return { site, title, hue };
}
