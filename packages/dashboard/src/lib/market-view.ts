// What the Marketplace shows, worked out from what the server sends: the
// extensions with their names, what each brings and needs, who needs it,
// what installing or removing does, the connections (where the code and
// the tasks are) and the product kits. Kept apart from the components so it
// is checked on its own. Names and lines are words: Kobble's own come from
// the catalogue by id; an extension it does not know (a team's own) shows
// the name and line of its own definition.

import type { AddOnView, KitView, ProductView } from "../api/client.ts";
import type { Messages } from "../i18n/messages.ts";
import { KOBOLDS } from "./kobolds.ts";

export type Words = Messages["market"];
type Shell = Messages["shell"];

// What a lookup by id finds, or nothing (never something every object has).
function found<T>(map: Record<string, T>, id: string): T | undefined {
  return Object.hasOwn(map, id) ? map[id] : undefined;
}

export const nameOf = (words: Words, addOn: AddOnView): string =>
  found<{ name: string }>(words.extensions, addOn.id)?.name ?? addOn.name;

export const lineOf = (words: Words, addOn: AddOnView): string =>
  found<{ about: string }>(words.extensions, addOn.id)?.about ?? addOn.about;

export type Maker = "kobble" | "team";

// Kobble's own extensions ship with the factory; any other is the team's.
export const makerOf = (addOn: AddOnView): Maker =>
  addOn.builtIn ? "kobble" : "team";

// ---- The extensions tab ----

export const FILTERS = ["all", "installed", "kobble", "team"] as const;
export type Filter = (typeof FILTERS)[number];

// Boards are connections, not extensions: they are on the next tab.
export const extensionsOf = (addOns: AddOnView[]): AddOnView[] =>
  addOns.filter((addOn) => !addOn.tracker);

export function matching(
  addOns: AddOnView[],
  words: Words,
  filter: Filter,
  query: string,
): AddOnView[] {
  const asked = query.trim().toLowerCase();
  return extensionsOf(addOns).filter(
    (addOn) =>
      (filter === "all" ||
        (filter === "installed" && addOn.on) ||
        (filter !== "installed" && makerOf(addOn) === filter)) &&
      `${nameOf(words, addOn)} ${lineOf(words, addOn)}`
        .toLowerCase()
        .includes(asked),
  );
}

// What installing it also installs: what it needs, and what that needs,
// that is not installed yet; first the ones it needs, it itself last.
export function installPlan(addOns: AddOnView[], id: string): AddOnView[] {
  const plan: AddOnView[] = [];
  const visit = (wanted: string) => {
    const addOn = addOns.find((one) => one.id === wanted);
    if (!addOn || addOn.on || plan.includes(addOn)) return;
    addOn.needs.forEach(visit);
    plan.push(addOn);
  };
  visit(id);
  return plan;
}

// The installed extensions that need this one.
export const neededBy = (addOns: AddOnView[], id: string): AddOnView[] =>
  extensionsOf(addOns).filter((one) => one.on && one.needs.includes(id));

// What goes when it is removed (its page, Home blocks and kobold) and what
// stays in the factory's files, in a sentence each.
export function removing(
  words: Words,
  addOn: AddOnView,
  list: (items: string[]) => string,
): string[] {
  const goes = [
    addOn.brings.pages.length > 0 && words.its.page,
    addOn.brings.blocks.length > 0 && words.its.blocks,
    addOn.brings.kobolds.length > 0 && words.its.kobolds,
  ].filter((one) => one !== false);
  const stays = found<string>(words.staysIn, addOn.id) ?? words.staysOther;
  return [
    ...(goes.length > 0 ? [words.goes(list(goes))] : []),
    words.stays(stays),
  ];
}

// The plain line that says why one that others need stays.
export function refusal(
  words: Words,
  addOns: AddOnView[],
  addOn: AddOnView,
  list: (items: string[]) => string,
): string | null {
  const needing = neededBy(addOns, addOn.id);
  if (needing.length === 0) return null;
  return words.neededBy(
    list(needing.map((one) => nameOf(words, one))),
    nameOf(words, addOn),
    needing.length > 1,
  );
}

// The line under an always-needed one, in place of Remove.
export const alwaysLine = (words: Words, id: string): string => {
  const why = found<string>(words.why, id);
  return why === undefined ? words.always : words.alwaysBecause(why);
};

// ---- The details of one thing: an extension, a connection or a kit ----

// A chip, leading to another thing's details when it has `to` (a thing's
// key, or "connections" for the tab).
export type Link = { label: string; to: string | null };

export type Thing = {
  // "extension:signals", "code:github", "tasks:jira", "kit:react-web-app".
  key: string;
  kind: "extension" | "connection" | "kit";
  // Whose icon: an extension's or kit's id.
  look: string;
  name: string;
  about: string;
  maker: Maker;
  state: "installed" | "inUse" | "preinstalled" | null;
  // What it brings, a row each: Page, Home blocks, Stage, Kobold.
  brings: { label: string; names: string[] }[];
  needs: Link[];
  // Who needs it (an extension): none is a line saying so.
  neededBy: Link[] | null;
  // Who uses it: extensions for a connection, products for a kit.
  usedBy:
    | { kind: "things"; links: Link[] }
    | { kind: "products"; names: string[] }
    | null;
  // Its settings groups (an installed extension's).
  settings: string[];
};

const link = (words: Words, addOn: AddOnView): Link => ({
  label: nameOf(words, addOn),
  to: `extension:${addOn.id}`,
});

export function brought(
  words: Words,
  shell: Shell,
  addOn: AddOnView,
): Thing["brings"] {
  const { pages, blocks, kobolds, stages } = addOn.brings;
  // Kobble's own are words; a team's own say their names themselves.
  const nameIn =
    (map: Record<string, string>, own: { id: string; name: string }[]) =>
    (id: string) =>
      found(map, id) ?? own.find((one) => one.id === id)?.name ?? id;
  const { screens } = addOn;
  const rows = [
    {
      label: words.brings.page(pages.length),
      names: pages.map(nameIn(shell.pages, screens.pages)),
    },
    {
      label: words.brings.blocks,
      names: blocks.map(nameIn(words.blocks, screens.blocks)),
    },
    {
      label: words.brings.stage(stages.length),
      names: stages.map(nameIn(words.stages, screens.stages)),
    },
    {
      label: words.brings.kobold(kobolds.length),
      names: kobolds.map(
        (id) => KOBOLDS.find((kobold) => kobold.id === id)?.name ?? id,
      ),
    },
  ];
  return rows.filter((row) => row.names.length > 0);
}

export function extensionThing(
  words: Words,
  shell: Shell,
  addOns: AddOnView[],
  addOn: AddOnView,
): Thing {
  const needed = addOn.needs.flatMap((id) => {
    const one = addOns.find((other) => other.id === id);
    return one ? [link(words, one)] : [];
  });
  const slots = addOn.slots.map((slot) => ({
    label: words.slots[slot as keyof Words["slots"]],
    to: "connections",
  }));
  return {
    key: `extension:${addOn.id}`,
    kind: "extension",
    look: addOn.id,
    name: nameOf(words, addOn),
    about: lineOf(words, addOn),
    maker: makerOf(addOn),
    state: addOn.on ? "installed" : null,
    brings: brought(words, shell, addOn),
    needs: [...needed, ...slots],
    neededBy: neededBy(addOns, addOn.id).map((one) => link(words, one)),
    usedBy: null,
    settings: addOn.on ? addOn.settings : [],
  };
}

// ---- The connections tab ----

export type Slot = "code" | "tasks";

// Where the code lives: the extension that fills the slot (GitHub, the only
// one today), always in use.
export function codeThing(
  words: Words,
  addOns: AddOnView[],
  filler = "github",
): Thing {
  const by =
    filler === "github" ? undefined : addOns.find((a) => a.id === filler);
  const own = words.connections.code;
  return {
    key: `code:${filler}`,
    kind: "connection",
    look: filler,
    name: by ? nameOf(words, by) : own.name,
    about: by ? lineOf(words, by) : own.line,
    maker: "kobble",
    state: "inUse",
    brings: [],
    needs: [],
    neededBy: null,
    usedBy: usedByOf(words, addOns, "code"),
    settings: [],
  };
}

// A board where the tasks are kept: in use when the company tracks work
// there.
export function boardThing(
  words: Words,
  addOns: AddOnView[],
  board: AddOnView,
  tracker: string,
): Thing {
  return {
    key: `tasks:${board.id}`,
    kind: "connection",
    look: board.id,
    name: nameOf(words, board),
    about: lineOf(words, board),
    maker: "kobble",
    state: tracker === board.id ? "inUse" : null,
    brings: [],
    needs: [],
    neededBy: null,
    usedBy: usedByOf(words, addOns, "tasks"),
    settings: [],
  };
}

function usedByOf(
  words: Words,
  addOns: AddOnView[],
  slot: Slot,
): Thing["usedBy"] {
  return {
    kind: "things",
    links: extensionsOf(addOns)
      .filter((one) => one.on && one.slots.includes(slot))
      .map((one) => link(words, one)),
  };
}

// What to press on a board: nothing on the one in use; Connect while no
// board is connected; otherwise the way over to this one.
export type BoardAction =
  | { kind: "none" }
  | { kind: "connect" }
  | { kind: "switch"; from: AddOnView; to: AddOnView };

export function boardAction(
  boards: AddOnView[],
  board: AddOnView,
  tracker: string,
): BoardAction {
  if (tracker === board.id) return { kind: "none" };
  const now = boards.find((one) => one.id === tracker);
  return now ? { kind: "switch", from: now, to: board } : { kind: "connect" };
}

// ---- The product kits tab ----

export const usersOfKit = (kit: KitView, products: ProductView[]): string[] =>
  products.filter((product) => product.kit === kit.id).map((p) => p.name);

export function kitThing(
  words: Words,
  kit: KitView,
  products: ProductView[],
): Thing {
  return {
    key: `kit:${kit.id}`,
    kind: "kit",
    look: kit.id,
    name: kit.name,
    about: kit.about,
    maker: kit.madeBy,
    state: "preinstalled",
    brings: [
      {
        label: "",
        names: kit.brings.map((one) => words.kitBrings[one]),
      },
    ],
    needs: [],
    neededBy: null,
    usedBy: { kind: "products", names: usersOfKit(kit, products) },
    settings: [],
  };
}

// The thing a key names ("extension:signals", "code:github", "tasks:jira",
// "kit:react-web-app"), or nothing.
export function thingOf(
  words: Words,
  shell: Shell,
  from: {
    addOns: AddOnView[];
    kits: KitView[];
    products: ProductView[];
    tracker: string;
    // The extension that fills the slot Your code.
    codeBy?: string;
  },
  key: string | null,
): Thing | null {
  const at = (key ?? "").indexOf(":");
  const kind = (key ?? "").slice(0, at);
  const id = (key ?? "").slice(at + 1);
  const addOn = from.addOns.find((one) => one.id === id);
  const kit = from.kits.find((one) => one.id === id);
  if (kind === "code") return codeThing(words, from.addOns, from.codeBy);
  if (kind === "extension" && addOn)
    return extensionThing(words, shell, from.addOns, addOn);
  if (kind === "tasks" && addOn)
    return boardThing(words, from.addOns, addOn, from.tracker);
  return kind === "kit" && kit ? kitThing(words, kit, from.products) : null;
}
