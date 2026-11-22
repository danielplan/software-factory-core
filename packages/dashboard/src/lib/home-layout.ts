// How Home is arranged, worked out apart from the page so it is checked on
// its own. Home is a list of blocks, each brought by an extension, shown in
// an order the team chose and kept for the whole team (factory/home.json).
// Only the blocks of installed extensions are offered; a block whose
// extension is removed leaves Home and comes back, in its place, with it.

import type { AddOnView } from "../api/client.ts";
import type { Layout } from "../api/schemas/home.ts";

export type { Layout };

// Home as it was before it could be arranged: the product line, what waits
// and the loop. Every other block starts off Home, so Home is the same until
// the team adds one.
export const START: Layout = {
  order: ["status", "waiting", "loop", "exploring", "signals", "reviews"],
  hidden: ["exploring", "signals", "reviews"],
};

// The extension that brings each block, installed or not.
export function ownersOf(addOns: AddOnView[]): Map<string, AddOnView> {
  const owners = new Map<string, AddOnView>();
  for (const addOn of addOns)
    for (const block of addOn.brings.blocks) owners.set(block, addOn);
  return owners;
}

// A layout kept before a block existed gets it, off Home, at the end.
export function whole(layout: Layout, known: Iterable<string>): Layout {
  const added = [...new Set([...START.order, ...known])].filter(
    (id) => !layout.order.includes(id),
  );
  return {
    order: [...layout.order, ...added],
    hidden: [...layout.hidden, ...added],
  };
}

// The layout to start from: the team's, or Home as it was.
export function layoutFrom(kept: Layout | null, addOns: AddOnView[]): Layout {
  return whole(kept ?? START, ownersOf(addOns).keys());
}

// The ids of the blocks that an installed extension brings.
export function offeredOf(addOns: AddOnView[]): Set<string> {
  return new Set(
    addOns.filter((addOn) => addOn.on).flatMap((addOn) => addOn.brings.blocks),
  );
}

// The blocks Home shows now, from the top.
export const shownOf = (layout: Layout, offered: Set<string>): string[] =>
  layout.order.filter((id) => !layout.hidden.includes(id) && offered.has(id));

// A block dropped on another goes before it.
export function moveBefore(
  order: string[],
  id: string,
  target: string,
): string[] {
  if (id === target) return order;
  const rest = order.filter((one) => one !== id);
  rest.splice(rest.indexOf(target), 0, id);
  return rest;
}

// A block one place up or down among the ones shown.
export function nudge(
  layout: Layout,
  id: string,
  by: -1 | 1,
  offered: Set<string>,
): Layout {
  const shown = shownOf(layout, offered);
  const next = shown[shown.indexOf(id) + by];
  if (!next) return layout;
  const order = [...layout.order];
  const a = order.indexOf(id);
  const b = order.indexOf(next);
  order[a] = next;
  order[b] = id;
  return { ...layout, order };
}

// A block hidden leaves Home but keeps its place in the order.
export const hide = (layout: Layout, id: string): Layout =>
  layout.hidden.includes(id)
    ? layout
    : { ...layout, hidden: [...layout.hidden, id] };

// Where a block goes among the ones shown (`at` counts them from the top);
// it is shown from then on.
export function placeAt(
  layout: Layout,
  id: string,
  at: number,
  offered: Set<string>,
): Layout {
  const rest = layout.order.filter((one) => one !== id);
  const seen = rest.filter(
    (one) => !layout.hidden.includes(one) && offered.has(one),
  );
  const order = [...rest];
  const next = seen[at];
  const last = seen[seen.length - 1];
  if (next) order.splice(rest.indexOf(next), 0, id);
  else if (last) order.splice(rest.indexOf(last) + 1, 0, id);
  else order.push(id);
  return { order, hidden: layout.hidden.filter((one) => one !== id) };
}

// A block's name and line: words by its id; one the catalogue does not know
// (a team's own) shows its id.
export function wordOf(map: Record<string, string>, id: string): string {
  return Object.hasOwn(map, id) ? (map[id] ?? id) : id;
}
