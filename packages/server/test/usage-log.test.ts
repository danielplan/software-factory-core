import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore, usageFolder } from "@software-factory/core";

import { LoggedStore } from "../src/kobble/logged-store.ts";
import { UsageLog } from "../src/kobble/usage-log.ts";
import { pictureOfPrototype } from "../src/kobble/usage-pictures.ts";

// The usage log: off unless switched on, every change to an exploration as
// one line, prototype pictures when one is opened; it never stops anyone.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

function factory() {
  const project = mkdtempSync(join(tmpdir(), "usage-"));
  const root = join(project, "factory");
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  return { project, root };
}

function lines(folder: string) {
  return readFileSync(join(folder, "usage.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("the usage log is off by default, on with the team's setting, next to the project", () => {
  const { project, root } = factory();
  assert.equal(usageFolder(root, project), null);
  mkdirSync(join(root, "settings"));
  writeFileSync(
    join(root, "settings", "factory.env"),
    "FACTORY_USAGE_LOG=on\n",
  );
  assert.equal(usageFolder(root, project), `${project}-usage`);
  writeFileSync(
    join(root, "settings", "factory.env"),
    "FACTORY_USAGE_LOG=on\nFACTORY_USAGE_FOLDER=study\n",
  );
  assert.equal(usageFolder(root, project), join(project, "study"));
  // Switched on for the team in team.env; the folder stays this computer's.
  writeFileSync(
    join(root, "settings", "factory.env"),
    "FACTORY_USAGE_FOLDER=mine\n",
  );
  assert.equal(usageFolder(root, project), null);
  writeFileSync(join(root, "team.env"), "FACTORY_USAGE_LOG=on\n");
  assert.equal(usageFolder(root, project), join(project, "mine"));
});

test("every change to an exploration is one line: made, said, board, status", () => {
  const { project, root } = factory();
  const folder = join(project, "log");
  const store = new LoggedStore(root, project, new UsageLog(folder));
  const plain = new KobbleStore(root);
  const [first] = plain.all("explorations");
  assert.ok(first);
  store.put("explorations", { ...first, id: "X-90", title: "New one" });
  store.put("explorations", {
    ...first,
    id: "X-90",
    title: "Renamed",
    status: "dropped",
  });
  store.saveConversation("X-90", {
    session: null,
    messages: [
      { from: "you", text: "Hello" },
      { from: "kobold", text: "Hi" },
    ],
  });
  const board = plain.board(first.id);
  store.saveBoard("X-90", board);
  store.saveBoard("X-90", board);
  const events = lines(folder).map((one) => one.event);
  assert.deepEqual(events.slice(0, 5), [
    "created",
    "renamed",
    "status",
    "you-said",
    "kobold-said",
  ]);
  assert.equal(
    events.filter((e) => e === "board").length,
    board.things.length > 0 ? 1 : 0,
  );
  assert.ok(lines(folder).every((one) => one.exploration === "X-90"));
  store.put("personas", plain.all("personas")[0]!);
});

test("a prototype asked for, made and agreed is written down", async () => {
  const { boardEvents } = await import("../src/kobble/usage-log.ts");
  const thing = {
    id: "prototype-a",
    kind: "prototype" as const,
    agreed: false,
    place: null,
    by: "person" as const,
    key: "A",
    name: "List",
    difference: "a list",
    branch: "proto/X-1-a",
    tests: [],
  };
  const empty = { things: [], links: [] };
  const asked = { things: [thing], links: [] };
  const made = { things: [{ ...thing, said: "Added a list." }], links: [] };
  const agreed = {
    things: [{ ...thing, said: "Added a list.", agreed: true }],
    links: [],
  };
  type Shown = Parameters<typeof boardEvents>[0];
  const kinds = (a: unknown, b: unknown) =>
    boardEvents(a as Shown, b as Shown).map((e) => e.event);
  assert.deepEqual(kinds(empty, asked), ["board", "prototype-asked"]);
  assert.deepEqual(kinds(asked, made), ["board", "prototype-made"]);
  assert.deepEqual(kinds(made, agreed), ["board", "prototype-agreed"]);
});

test("a picture of an opened prototype at two widths; none when it cannot", async () => {
  const folder = mkdtempSync(join(tmpdir(), "usage-"));
  const usage = new UsageLog(folder, () => new Date(0));
  const taken: string[] = [];
  await pictureOfPrototype({
    usage,
    exploration: "X-1",
    key: "A",
    address: () => Promise.resolve("http://127.0.0.1:5301"),
    photograph: (_url, file, size) => {
      taken.push(size);
      writeFileSync(file, "png");
      return Promise.resolve();
    },
    now: new Date(0),
  });
  assert.deepEqual(taken, ["1440,900", "390,844"]);
  assert.equal(readdirSync(join(folder, "prototypes", "X-1")).length, 2);
  assert.equal(lines(folder)[0]?.event, "prototype-opened");
  await pictureOfPrototype({
    usage,
    exploration: "X-2",
    key: "A",
    address: () => Promise.reject(new Error("did not start")),
  });
  assert.ok(!existsSync(join(folder, "prototypes", "X-2")));
});
