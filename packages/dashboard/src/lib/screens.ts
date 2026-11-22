// The pages and Home blocks a team's own extension describes, found by id
// among the extensions. Kobble's own are drawn by the page in code and have no
// description here, so they have no screen; their names are words.

import type { AddOnView, ShownView } from "@/api";

import { wordOf } from "./home-layout";

type Kind = "pages" | "blocks";

// The screen of this id, with the extension that brings it.
export function screenOf(
  addOns: AddOnView[],
  kind: Kind,
  id: string,
  installedOnly = false,
): { addOn: AddOnView; view: ShownView } | undefined {
  for (const addOn of addOns) {
    if (installedOnly && !addOn.on) continue;
    const view = addOn.screens[kind].find((one) => one.id === id);
    if (view) return { addOn, view };
  }
  return undefined;
}

// The pages of installed extensions, for the sidebar, in the order of the
// extensions.
export function teamPagesOf(addOns: AddOnView[]): ShownView[] {
  return addOns.filter((addOn) => addOn.on).flatMap((a) => a.screens.pages);
}

// A block's name: its own words for a team's, the catalogue's for Kobble's.
export function blockName(
  words: Record<string, string>,
  addOns: AddOnView[],
  id: string,
): string {
  return screenOf(addOns, "blocks", id)?.view.name ?? wordOf(words, id);
}

// What a block shows, in a line: its own for a team's, else its extension's.
export function blockAbout(
  words: Record<string, string>,
  addOns: AddOnView[],
  id: string,
): string {
  const found = screenOf(addOns, "blocks", id);
  return found ? (found.view.about ?? found.addOn.about) : wordOf(words, id);
}

// A page's name in the sidebar and a page's own title.
export const pageName = (addOns: AddOnView[], id: string): string | undefined =>
  screenOf(addOns, "pages", id, true)?.view.name;
