// Where the dashboard is, from the address after the # (#explore/<id>), so
// a reload stays there. React Router shows the page (app/router.tsx); this
// says which page the sidebar lights and what is open in it. Addresses
// from before the pages were renamed or taken away (#board, #ideas/<id>,
// #workshop, #add-ons, #settings/add-ons, #today, #customers, #products,
// #understand, #prototype) still lead somewhere that makes sense.

import type { AddOnView } from "../api/client.ts";
import { screenOf } from "./screens.ts";

// "team" is a page one of the team's own extensions brings (#team/<id>).
// Explorations is still the page "explore", and the Factory board "build":
// their addresses stay as they were.
export const PAGES = [
  "home",
  "system",
  "signals",
  "explore",
  "build",
  "releases",
  "personas",
  "extensions",
  "settings",
  "team",
] as const;
export type Page = (typeof PAGES)[number];

// The page, and what is open in it: an exploration, a persona. Connecting a board (#connect) is a page of its own,
// outside the sidebar.
export type Place = {
  page: Page | "connect";
  open: string | null;
};

// The page shown when the address names none: what waits for you.
const FIRST: Page = "home";

// The old pages and where they are now.
export const MOVED = new Map([
  ["board", "build"],
  ["ideas", "explore"],
  ["workshop/add-ons", "extensions"],
  ["settings/add-ons", "extensions"],
  ["workshop", "system"],
  ["add-ons", "extensions"],
  ["today", "signals"],
  ["feedback", "signals"],
  ["customers", "personas"],
  ["products", "system"],
  ["understand", "personas"],
  ["prototype", "explore/"],
]);

// The parts of an address, written as a hash (#explore/X-1) or as the
// router's path (/explore/X-1).
function partsOf(hash: string): { asked: string; rest: string | null } {
  const path = hash.replace(/^[#/]/, "");
  const slash = path.indexOf("/");
  if (slash === -1) return { asked: path, rest: null };
  return { asked: path.slice(0, slash), rest: path.slice(slash + 1) || null };
}

// The address an old one has moved to (#ideas/abc: #explore/abc), or null
// when it has not moved.
export function movedHash(hash: string): string | null {
  const { asked, rest } = partsOf(hash);
  const whole = rest === null ? undefined : MOVED.get(`${asked}/${rest}`);
  if (whole !== undefined) return `#${whole}`;
  const now = MOVED.get(asked);
  if (now === undefined) return null;
  return rest === null || now.includes("/") ? `#${now}` : `#${now}/${rest}`;
}

export function placeOf(hash: string): Place {
  const moved = movedHash(hash);
  const { asked, rest } = partsOf(moved ?? hash);
  if (asked === "connect") return { page: asked, open: rest };
  const page = PAGES.find((one) => one === asked);
  return page ? { page, open: rest } : { page: FIRST, open: null };
}

// The router's path for an address written the old way (#explore/X-3), as
// the server still sends where Sprocket takes the person.
export function pathOf(address: string): string {
  return `/${address.replace(/^#?\/?/, "")}`;
}

// A persona's page (/personas/<id>), its tests or one of them, or the list.
export function personaPath(id?: string, tests?: { test?: string }): string {
  if (!id) return "/personas";
  const base = `/personas/${encodeURIComponent(id)}`;
  if (!tests) return base;
  return tests.test
    ? `${base}/tests/${encodeURIComponent(tests.test)}`
    : `${base}/tests`;
}

// The pages of the core, always there; an extension's are there only while
// it is installed.
const CORE_PAGES = new Set<Place["page"]>([
  "home",
  "system",
  "extensions",
  "settings",
  "connect",
]);

// The page of an extension that is removed is not there: Home shows instead.
export function placeShown(
  place: Place,
  pages: readonly { id: string }[],
  addOns: AddOnView[],
): Place {
  const there =
    CORE_PAGES.has(place.page) ||
    pages.some((page) => page.id === place.page) ||
    (place.page === "team" &&
      place.open !== null &&
      screenOf(addOns, "pages", decodeURIComponent(place.open), true) !==
        undefined);
  return there ? place : { page: FIRST, open: null };
}
