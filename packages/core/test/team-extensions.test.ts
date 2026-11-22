import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  defineExtension,
  loadFactory,
  orderStages,
  shownView,
  OWN_EXTENSIONS_KEY,
  ownExtensionsOn,
  readTeamExtensions,
  TEAM_EXTENSION_FILE,
  TEAM_EXTENSIONS_FOLDER,
} from "../src/index.ts";
import { available, systemTab } from "./stand-ins.ts";

// A team's own extensions: found in the factory folder, each checked, and
// the ones that pass offered next to Kobble's own.

function factoryWith(extensions: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "team-extensions-"));
  writeFileSync(
    join(root, "factory.json"),
    JSON.stringify({ name: "Beta", extensions: ["standup"] }),
  );
  for (const [name, description] of Object.entries(extensions)) {
    const folder = join(root, TEAM_EXTENSIONS_FOLDER, name);
    mkdirSync(folder, { recursive: true });
    if (description !== undefined)
      writeFileSync(
        join(folder, TEAM_EXTENSION_FILE),
        typeof description === "string"
          ? description
          : JSON.stringify(description),
      );
  }
  return root;
}

const standup = {
  id: "standup",
  name: "Daily standup",
  about: "A short note each morning.",
  brings: { pages: ["standup"], blocks: ["standup-note"] },
  pages: [
    {
      id: "standup",
      name: "Daily standup",
      parts: [{ show: "text", text: "What did you do yesterday?" }],
    },
  ],
  blocks: [
    {
      id: "standup-note",
      name: "Standup note",
      parts: [{ show: "text", text: "Write it down." }],
    },
  ],
};

test("an extension of the team that passes the checks is loaded", () => {
  const root = factoryWith({ standup });
  const found = readTeamExtensions(root, [systemTab]);
  assert.deepEqual(found.problems, []);
  assert.deepEqual(
    found.extensions.map((e) => [e.id, e.core, e.brings.blocks]),
    [["standup", false, ["standup-note"]]],
  );
  const factory = loadFactory(root, available);
  assert.ok(!("problem" in factory));
  assert.deepEqual(factory.problems, []);
  assert.ok(factory.extensions.some((e) => e.id === "standup"));
});

test("a guide is read from the extension's own folder", () => {
  const root = factoryWith({
    standup: {
      ...standup,
      guides: [{ agent: "builder", title: "Standup", file: "guide.md" }],
    },
  });
  writeFileSync(join(root, "extensions", "standup", "guide.md"), "# Standup");
  const [one] = readTeamExtensions(root, []).extensions;
  assert.equal(
    one?.guides[0]?.file.endsWith("extensions/standup/guide.md"),
    true,
  );
});

const refused: [string, Record<string, unknown>, RegExp][] = [
  ["no file", { standup: undefined }, /has no extension\.json/],
  ["not JSON", { standup: "{ not json" }, /cannot be read/],
  [
    "a name that is not the folder's",
    { standup: { ...standup, id: "other" } },
    /folder and the id must be the same/,
  ],
  [
    "a Kobble extension's id",
    { "system-tab": { ...standup, id: "system-tab" } },
    /has the id of System tab/,
  ],
  [
    "being always needed",
    { standup: { ...standup, always: true } },
    /says "always"/,
  ],
  ["starting programs", { standup: { ...standup, parts: [] } }, /says "parts"/],
  [
    "a word it does not know",
    { standup: { ...standup, colour: "red" } },
    /not right/,
  ],
  [
    "a missing line",
    { standup: { id: "standup", name: "Daily standup" } },
    /not right/,
  ],
  [
    "a guide outside its folder",
    {
      standup: {
        ...standup,
        guides: [{ agent: "builder", title: "x", file: "../factory.json" }],
      },
    },
    /not in its own folder/,
  ],
  [
    "a page it does not describe",
    { standup: { ...standup, brings: { pages: ["standup", "more"] } } },
    /brings the page "more" but does not describe it/,
  ],
  [
    "a page that is Kobble's own",
    {
      standup: {
        ...standup,
        brings: { blocks: ["standup-note"] },
        pages: [{ ...standup.pages[0], id: "settings" }],
      },
    },
    /brings the page "settings", which is Kobble's own/,
  ],
  [
    "a stage next to itself",
    {
      standup: {
        ...standup,
        stages: [{ id: "check", name: "Check", after: ["check"] }],
      },
    },
    /next to itself/,
  ],
  [
    "a list from a file outside its folder",
    {
      standup: {
        ...standup,
        pages: [
          {
            ...standup.pages[0],
            parts: [{ show: "list", from: "../factory.json" }],
          },
        ],
      },
    },
    /not in its own folder/,
  ],
  [
    "settings kept somewhere else",
    {
      standup: {
        ...standup,
        settings: [
          {
            id: "standup",
            name: "Standup",
            about: "x",
            file: "../../.env",
            usedBy: [],
            fields: [{ key: "STANDUP", label: "x", help: "x", kind: "text" }],
          },
        ],
      },
    },
    /only team\.env and the settings folder/,
  ],
];

for (const [name, extensions, problem] of refused)
  test(`one that has ${name} is left out and says why`, () => {
    const root = factoryWith(extensions);
    const found = readTeamExtensions(root, [systemTab]);
    assert.deepEqual(found.extensions, []);
    assert.equal(found.problems.length, 1);
    assert.match(found.problems[0] ?? "", problem);
  });

test("one that fails never stops the others", () => {
  const root = factoryWith({
    broken: "{",
    standup,
  });
  const found = readTeamExtensions(root, []);
  assert.deepEqual(
    found.extensions.map((e) => e.id),
    ["standup"],
  );
  assert.equal(found.problems.length, 1);
});

test("what another extension brings is not brought twice", () => {
  const root = factoryWith({
    standup,
    // Folders are read in order: standup comes first and keeps its block.
    viewer: {
      id: "viewer",
      name: "Viewer",
      about: "Notes.",
      brings: { blocks: ["standup-note"] },
    },
  });
  const found = readTeamExtensions(root, []);
  assert.deepEqual(
    found.extensions.map((e) => e.id),
    ["standup"],
  );
  assert.match(found.problems[0] ?? "", /brings "standup-note"/);
});

test("switched off, none is loaded and nothing is said", () => {
  const root = factoryWith({ standup });
  writeFileSync(join(root, "team.env"), `${OWN_EXTENSIONS_KEY}=off\n`);
  assert.equal(ownExtensionsOn(root), false);
  const factory = loadFactory(root, available);
  assert.ok(!("problem" in factory));
  assert.ok(!factory.extensions.some((e) => e.id === "standup"));
  // The company still lists it: the factory says it is missing.
  assert.match(factory.problems.join("\n"), /no extension "standup"/);
});

test("a factory with no extensions folder has nothing to load", () => {
  const root = mkdtempSync(join(tmpdir(), "team-extensions-"));
  assert.deepEqual(readTeamExtensions(root, []), {
    extensions: [],
    problems: [],
  });
  assert.equal(ownExtensionsOn(root), true);
});

function withList(content: string) {
  const root = factoryWith({
    standup: {
      ...standup,
      pages: [
        {
          ...standup.pages[0],
          parts: [
            { show: "text", text: "Hello" },
            {
              show: "list",
              title: "Open",
              items: [{ title: "Written in the file" }],
              from: "open.json",
              empty: "Nothing open",
            },
          ],
        },
      ],
    },
  });
  writeFileSync(join(root, "extensions", "standup", "open.json"), content);
  return root;
}

test("a list kept in a file of the extension is read each time it is shown", () => {
  const root = withList(JSON.stringify([{ title: "Ask Sam", tag: "late" }]));
  const [one] = readTeamExtensions(root, []).extensions;
  const page = one?.pages[0];
  assert.ok(page);
  assert.deepEqual(shownView(page).parts[1], {
    show: "list",
    title: "Open",
    empty: "Nothing open",
    items: [
      { title: "Written in the file" },
      { title: "Ask Sam", tag: "late" },
    ],
  });
  // The file changes: the page shows the change, with no reload of the factory.
  writeFileSync(
    join(root, "extensions", "standup", "open.json"),
    JSON.stringify([{ title: "Book the room" }]),
  );
  assert.deepEqual(
    shownView(page).parts.map((part) => part.show === "list" && part.items),
    [false, [{ title: "Written in the file" }, { title: "Book the room" }]],
  );
  // A file spoiled since shows as no items instead of breaking the page.
  writeFileSync(join(root, "extensions", "standup", "open.json"), "{");
  assert.deepEqual(
    shownView(page).parts.map((part) => part.show === "list" && part.items),
    [false, [{ title: "Written in the file" }]],
  );
});

test("a list file that is not a list of items is refused before loading", () => {
  const found = readTeamExtensions(withList('{"title": "x"}'), []);
  assert.deepEqual(found.extensions, []);
  assert.match(found.problems[0] ?? "", /open\.json, which is not a list/);
  const unreadable = readTeamExtensions(withList("{"), []);
  assert.match(unreadable.problems[0] ?? "", /cannot be read as JSON/);
});

test("what an extension describes is brought without saying it twice", () => {
  const { brings, ...short } = standup;
  const root = factoryWith({ standup: short });
  const [one] = readTeamExtensions(root, []).extensions;
  assert.deepEqual(
    [one?.brings.pages, one?.brings.blocks],
    [["standup"], ["standup-note"]],
  );
  assert.ok(brings);
});

const stage = (
  id: string,
  more: { after?: string[]; before?: string[] } = {},
) => ({ id, name: id.toUpperCase(), ...more });

function extensionsOf(
  ...stages: [string, ReturnType<typeof stage>[]][]
): Parameters<typeof orderStages>[0] {
  return stages.map(([id, list]) =>
    defineExtension({ id, name: id, about: id, stages: list }),
  );
}

const idsOf = (order: ReturnType<typeof orderStages>) =>
  order.order.map((one) => one.id);

test("stages are ordered from the neighbours the extensions name", () => {
  const order = orderStages(
    extensionsOf(
      ["factory", [stage("build", { after: ["explore"], before: ["done"] })]],
      ["done", [stage("done", { after: ["build"] })]],
      ["ideas", [stage("explore", { before: ["build"] })]],
    ),
  );
  assert.deepEqual(idsOf(order), ["explore", "build", "done"]);
  assert.equal(order.clash, null);
});

test("a neighbour that is not installed is no problem", () => {
  const order = orderStages(
    extensionsOf(
      ["factory", [stage("build", { after: ["explore", "signals"] })]],
      ["inbox", [stage("signals", { before: ["explore", "build"] })]],
    ),
  );
  assert.deepEqual(idsOf(order), ["signals", "build"]);
  assert.equal(order.clash, null);
});

test("two stages for the same place are a clash, until the team says which is first", () => {
  const extensions = extensionsOf(
    ["factory", [stage("build"), stage("done", { after: ["build"] })]],
    ["checks", [stage("verify", { after: ["build"], before: ["done"] })]],
    ["review", [stage("approve", { after: ["build"], before: ["done"] })]],
  );
  const open = orderStages(extensions);
  assert.deepEqual(
    [open.clash?.first.id, open.clash?.second.id],
    ["verify", "approve"],
  );
  assert.deepEqual(idsOf(open), ["build", "verify", "approve", "done"]);
  // The team's order settles it, and moves any stage it likes.
  const chosen = orderStages(extensions, [
    "build",
    "approve",
    "verify",
    "done",
  ]);
  assert.equal(chosen.clash, null);
  assert.deepEqual(idsOf(chosen), ["build", "approve", "verify", "done"]);
  assert.deepEqual(
    idsOf(orderStages(extensions, ["done", "build", "verify", "approve"])),
    ["done", "build", "verify", "approve"],
  );
});

test("stages that each want to come after the other are a clash too", () => {
  const order = orderStages(
    extensionsOf(
      ["one", [stage("a", { after: ["b"] })]],
      ["two", [stage("b", { after: ["a"] })]],
    ),
  );
  assert.ok(order.clash);
  assert.deepEqual(idsOf(order), ["a", "b"]);
});

test("a stage the team's order does not know yet goes where its extension suggests", () => {
  const extensions = extensionsOf(
    ["factory", [stage("build"), stage("done", { after: ["build"] })]],
    ["checks", [stage("verify", { after: ["build"], before: ["done"] })]],
    ["early", [stage("plan", { before: ["build"] })]],
    ["loose", [stage("other")]],
  );
  const order = orderStages(extensions, ["done", "build"]);
  assert.deepEqual(idsOf(order), ["done", "plan", "build", "verify", "other"]);
  assert.equal(order.clash, null);
  // Ids the team's order names that are no stage any more are ignored.
  assert.deepEqual(
    idsOf(orderStages(extensions, ["gone", "done"])).slice(0, 1),
    ["done"],
  );
});
