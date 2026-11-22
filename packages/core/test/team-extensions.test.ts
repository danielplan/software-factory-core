import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  loadFactory,
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
    notes: {
      id: "notes",
      name: "Notes",
      about: "Notes.",
      brings: { blocks: ["standup-note"] },
    },
  });
  const found = readTeamExtensions(root, []);
  assert.deepEqual(
    found.extensions.map((e) => e.id),
    ["notes"],
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
