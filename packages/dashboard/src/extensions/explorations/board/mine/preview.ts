// A web address and its made-up preview, as a shared link shows it: a
// picture, the page's title, the site's name and small icon. No page is
// fetched: everything is worked out from the address itself, the same way
// each time. Some pages have no preview picture (documents, API and
// sign-in pages, a computer's own address): then only the icon, the address
// and the title are shown.

export type Preview = {
  site: string;
  // The address as it reads, without "https://".
  shown: string;
  title: string;
  hue: number;
  // Whether the page has a preview picture.
  picture: boolean;
};

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

// Sites that are known by a name of their own.
const NAMES: Record<string, string> = {
  "github.com": "GitHub",
  "youtube.com": "YouTube",
  "figma.com": "Figma",
  "notion.so": "Notion",
  "medium.com": "Medium",
  "wikipedia.org": "Wikipedia",
  "nytimes.com": "The New York Times",
  "linear.app": "Linear",
  "stackoverflow.com": "Stack Overflow",
  "google.com": "Google",
};

const hashOf = (text: string) => {
  let hash = 0;
  for (const c of text) hash = (hash * 31 + c.charCodeAt(0)) % 360;
  return hash;
};

const words = (segment: string) =>
  decodeURIComponent(segment)
    .replace(/\.\w{2,4}$/, "")
    .replace(/[-_+]+/g, " ")
    .trim();

const upper = (text: string) => text.replace(/^./, (c) => c.toUpperCase());

export function previewOf(address: string): Preview {
  const url = new URL(address);
  const host = url.hostname.replace(/^www\./, "");
  const root = host.split(".").slice(-2).join(".");
  const name = NAMES[root] ?? upper(root.split(".")[0] ?? host);
  const parts = url.pathname.split("/").filter(Boolean);
  const last = words(parts[parts.length - 1] ?? "");
  const title =
    root === "github.com" && parts.length >= 2
      ? `${parts[0] ?? ""}/${parts[1] ?? ""}: ${name}`
      : last
        ? `${upper(last)} · ${name}`
        : `${name}: ${host}`;
  const plain =
    /\.(pdf|txt|json|csv|zip|xml)$/i.test(url.pathname) ||
    /\/(docs?|api|login|signin|raw|download)(\/|$)/i.test(url.pathname) ||
    /^(api|docs)\./.test(host) ||
    /^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(host);
  return {
    site: name,
    shown: `${host}${url.pathname === "/" ? "" : url.pathname}${url.search}`,
    title,
    hue: hashOf(root),
    picture: !plain,
  };
}
