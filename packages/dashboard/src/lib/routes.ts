// Where the dashboard is, from the address after the # (#explore/<id>), so
// a reload stays there. Addresses from before the pages were renamed
// (#board, #ideas/<id>, #system, #add-ons) still lead to the same place.

export const PAGES = [
  "today",
  "understand",
  "explore",
  "build",
  "customers",
  "products",
  "workshop",
  "settings",
] as const;
export type Page = (typeof PAGES)[number];

// The page, and what is open in it: an idea on Explore, the add-ons on
// Workshop. Connecting a board (#connect) is a page of its own, outside the
// sidebar.
export type Place = { page: Page | "connect"; open: string | null };

// The page shown when the address names none: the work on the board.
const FIRST: Page = "build";

// The old pages and where they are now.
const MOVED = new Map([
  ["board", "build"],
  ["ideas", "explore"],
  ["system", "workshop"],
  ["add-ons", "workshop/add-ons"],
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
  const now = MOVED.get(asked);
  if (now === undefined) return null;
  return rest === null || now.includes("/") ? `#${now}` : `#${now}/${rest}`;
}

export function placeOf(hash: string): Place {
  const moved = movedHash(hash);
  const { asked, rest } = partsOf(moved ?? hash);
  if (asked === "connect") return { page: "connect", open: rest };
  const page = PAGES.find((one) => one === asked);
  return page ? { page, open: rest } : { page: FIRST, open: null };
}

// On Understand, what is open: a persona (#understand/<persona>), or one of
// their stories (#understand/<persona>/<story>); neither on the overview.
export type UnderstandPlace = { persona: string | null; story: string | null };

export function understandOf(open: string | null): UnderstandPlace {
  const [persona, story] = (open ?? "")
    .split("/")
    .map((part) => decodeURIComponent(part));
  return { persona: persona || null, story: (persona && story) || null };
}

// The address of the overview, a persona or a story.
export function understandHash(persona?: string, story?: string): string {
  const parts = [persona, persona && story].filter((part): part is string =>
    Boolean(part),
  );
  return ["#understand", ...parts.map(encodeURIComponent)].join("/");
}
