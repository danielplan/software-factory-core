import assert from "node:assert/strict";
import { test } from "node:test";

import type { AddOnView, ShownView } from "../src/api/client.ts";
import {
  blockAbout,
  blockName,
  pageName,
  screenOf,
  teamPagesOf,
} from "../src/lib/screens.ts";

const view = (id: string, name: string, about?: string): ShownView => ({
  id,
  name,
  icon: "puzzle",
  parts: [{ show: "text", text: "x" }],
  ...(about ? { about } : {}),
});

const addOn = (
  id: string,
  on: boolean,
  pages: ShownView[],
  blocks: ShownView[],
): AddOnView => ({
  id,
  name: `${id} extension`,
  about: `${id} line`,
  builtIn: false,
  on,
  tracker: false,
  always: false,
  needs: [],
  slots: [],
  brings: { pages: [], blocks: [], kobolds: [], stages: [] },
  screens: { pages, blocks, stages: [] },
  settings: [],
});

const addOns = [
  addOn(
    "standup",
    true,
    [view("standup", "Daily standup")],
    [view("standup-note", "Standup note", "A note for each morning")],
  ),
  addOn(
    "later",
    false,
    [view("later", "Later")],
    [view("later-note", "Later note")],
  ),
];

test("a page is found by its id, and only an installed one shows when asked so", () => {
  assert.equal(screenOf(addOns, "pages", "standup")?.addOn.id, "standup");
  assert.equal(screenOf(addOns, "pages", "later", true), undefined);
  assert.equal(screenOf(addOns, "pages", "later")?.view.name, "Later");
  assert.equal(pageName(addOns, "standup"), "Daily standup");
  assert.equal(pageName(addOns, "later"), undefined);
});

test("only the pages of installed extensions are in the sidebar", () => {
  assert.deepEqual(
    teamPagesOf(addOns).map((one) => one.id),
    ["standup"],
  );
});

test("a team's block has its own name and line, and Kobble's come from the words", () => {
  const words = { status: "Product status" };
  assert.equal(blockName(words, addOns, "standup-note"), "Standup note");
  assert.equal(
    blockAbout(words, addOns, "standup-note"),
    "A note for each morning",
  );
  // With no line of its own, the extension's line says what it is.
  assert.equal(blockAbout(words, addOns, "later-note"), "later line");
  assert.equal(blockName(words, addOns, "status"), "Product status");
  assert.equal(blockName(words, addOns, "unknown"), "unknown");
});
