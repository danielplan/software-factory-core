// What a web page shares about itself, as a link card shows it: its title,
// the site's name, a preview picture and the site's small icon. Kobble's own
// server reads the page (Open Graph and the usual tags, through
// open-graph-scraper), with no key and no outside service. Pages that share
// nothing, cannot be reached in a few seconds or are on a private network
// give less (or nothing): the card is then the simple one.

import { isIP } from "node:net";

import ogs from "open-graph-scraper";

export type Shared = {
  bytes: Uint8Array;
  kind: "png" | "jpg" | "gif" | "webp";
};
export type Preview = {
  title: string | null;
  site: string | null;
  image: Shared | null;
  icon: Shared | null;
};
// How a page is looked at: the real one reads the web; tests give their own.
export type Look = (address: string) => Promise<Preview>;

const PAGE_MS = 5000;
const PICTURE_MS = 4000;
const MOST_PICTURE = 2 * 1024 * 1024;
const MOST_ICON = 256 * 1024;
const KINDS: Record<string, Shared["kind"]> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

// An address on the open web: http or https, a name (not a number), and not
// the computer's own or a local network's.
export function onTheWeb(address: string): boolean {
  try {
    const url = new URL(address);
    const host = url.hostname.toLowerCase();
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      isIP(host.replace(/^\[|\]$/g, "")) === 0 &&
      host.includes(".") &&
      !/(^|\.)(localhost|local|internal|lan|home)$/.test(host)
    );
  } catch {
    return false;
  }
}

async function picture(
  address: string | undefined,
  base: string,
  most: number,
): Promise<Shared | null> {
  if (!address) return null;
  try {
    const url = new URL(address, base).href;
    if (!onTheWeb(url)) return null;
    const answer = await fetch(url, {
      signal: AbortSignal.timeout(PICTURE_MS),
    });
    const kind = KINDS[answer.headers.get("content-type")?.split(";")[0] ?? ""];
    if (!answer.ok || !kind) return null;
    const bytes = new Uint8Array(await answer.arrayBuffer());
    return bytes.length > 0 && bytes.length <= most ? { bytes, kind } : null;
  } catch {
    return null;
  }
}

const NOTHING: Preview = { title: null, site: null, image: null, icon: null };

export const lookAtPage: Look = async (address) => {
  if (!onTheWeb(address)) return NOTHING;
  try {
    const { result } = await ogs({
      url: address,
      timeout: PAGE_MS / 1000,
      fetchOptions: { headers: { "user-agent": "Mozilla/5.0 (Kobble)" } },
    });
    const where = result.requestUrl ?? address;
    const [image, icon] = await Promise.all([
      picture(result.ogImage?.[0]?.url, where, MOST_PICTURE),
      picture(result.favicon, where, MOST_ICON),
    ]);
    return {
      title: result.ogTitle ?? result.twitterTitle ?? null,
      site: result.ogSiteName ?? null,
      image,
      icon,
    };
  } catch {
    return NOTHING;
  }
};
