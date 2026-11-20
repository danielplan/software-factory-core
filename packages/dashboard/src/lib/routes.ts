// Where the dashboard is, from the address after the # (#explore/<id>), so
// a reload stays there. Addresses from before the pages were renamed or
// taken away (#board, #ideas/<id>, #workshop, #add-ons, #today, #customers,
// #products, #understand, #prototype) still lead somewhere that makes sense.

// Explorations is still the page "explore", and the Factory board "build":
// their addresses stay as they were.
export const PAGES = [
  "home",
  "system",
  "signals",
  "explore",
  "build",
  "personas",
  "settings",
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
const MOVED = new Map([
  ["board", "build"],
  ["ideas", "explore"],
  ["workshop/add-ons", "settings/add-ons"],
  ["workshop", "system"],
  ["add-ons", "settings/add-ons"],
  ["today", "signals"],
  ["customers", "personas"],
  ["products", "system"],
  ["understand", "personas"],
  ["prototype", "explore/"],
]);

function partsOf(hash: string): { asked: string; rest: string | null } {
  const path = hash.startsWith("#") ? hash.slice(1) : hash;
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

// A persona's page (#personas/<id>), its tests or one of them, or the list.
export function personaHash(id?: string, tests?: { test?: string }): string {
  if (!id) return "#personas";
  const base = `#personas/${encodeURIComponent(id)}`;
  if (!tests) return base;
  return tests.test
    ? `${base}/tests/${encodeURIComponent(tests.test)}`
    : `${base}/tests`;
}
