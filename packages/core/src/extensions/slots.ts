// The slots: the jobs the factory fills once for every extension (where the
// code lives, where the tasks are kept). Only Kobble defines a slot and only
// Kobble's own extensions fill one. The team fills each at setup (with the
// setup coach), every extension that uses a slot uses that one filler, and
// swapping it swaps it for all.

import type { Company } from "../company/company.ts";
import type { Extension, Slot } from "./extension.ts";
import { SLOTS } from "./extension.ts";

// The slots an extension can fill: what it says, and a tracker fills tasks.
export const fillsOf = (extension: Extension): Slot[] => [
  ...new Set([
    ...extension.fills,
    ...(extension.tracker ? (["tasks"] as const) : []),
  ]),
];

// One slot: who can fill it, and who does. Where the code lives has one
// filler today, so it is in use; the tasks are where the company's tracker
// is, or nowhere until one is connected.
export type SlotState = { slot: Slot; fillers: string[]; inUse: string | null };

// The slots, filled by the extensions there are (installed or not: Jira in
// use leaves the GitHub board off, but GitHub still holds the code).
export function slotsOf(
  extensions: Extension[],
  company: Company,
): SlotState[] {
  return SLOTS.map((slot) => {
    const fillers = extensions
      .filter((extension) => fillsOf(extension).includes(slot))
      .map((extension) => extension.id);
    const only = fillers.length === 1 ? (fillers[0] ?? null) : null;
    const inUse =
      slot === "tasks"
        ? (fillers.find((id) => id === company.tracker) ?? null)
        : only;
    return { slot, fillers, inUse };
  });
}
