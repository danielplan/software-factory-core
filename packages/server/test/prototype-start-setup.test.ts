import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  type Claude,
  KobbleStore,
  readCompany,
  saveCompany,
} from "@software-factory/core";

import { ExplorationPrototypes } from "../src/extensions/explorations/prototypes.ts";
import {
  ATTEMPTS,
  setUpStart,
  startGuide,
  startIn,
} from "../src/extensions/explorations/start-setup.ts";
import type { ExplorationWorlds } from "../src/extensions/explorations/worlds.ts";
import { git, inGit } from "./git-project.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { PrototypeMode } from "../src/prototypes/mode.ts";
import { versionCopy } from "../src/prototypes/copies.ts";

// A project with no start command: Tinker works one out while it makes the
// first prototype, the factory checks it comes up, and it is kept for the
// whole team.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

// A start command that comes up: a page on a free port, said as the
// factory asks.
const SERVER = `node -e "const s=require('http').createServer((q,r)=>r.end('ok')).listen(0,'127.0.0.1',()=>console.log('FACTORY_URL=http://127.0.0.1:'+s.address().port))"`;
const BROKEN = 'echo "cannot load its pages" >&2; exit 1';

function project(start?: { start: string; by?: "tinker" }) {
  const parent = mkdtempSync(join(tmpdir(), "start-setup-"));
  const folder = join(parent, "shop");
  const root = join(folder, "factory");
  mkdirSync(join(root, "kobble"), { recursive: true });
  writeFileSync(join(root, "factory.json"), JSON.stringify({ name: "Shop" }));
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  if (start) {
    const read = readCompany(join(root, "factory.json"));
    assert.ok("company" in read);
    saveCompany(root, { ...read.company, prototype: start });
  }
  git(folder, "init", "--quiet", "--initial-branch=main");
  inGit(folder);
  const store = new KobbleStore(root);
  for (const thing of store.board("X-1").things)
    if (thing.kind === "prototype") git(folder, "branch", thing.branch);
  return { folder, root, store };
}

function prototypesOf(
  on: ReturnType<typeof project>,
  claude: Claude,
): ExplorationPrototypes {
  return new ExplorationPrototypes({
    project: on.folder,
    root: on.root,
    claude,
    store: () => on.store,
    worlds: {
      offered: () => false,
      startFor: () => undefined,
    } as unknown as ExplorationWorlds,
    photograph: async (_url, file) => {
      writeFileSync(file, "png");
    },
    onChange: () => undefined,
  });
}

const companyStart = (root: string) => {
  const read = readCompany(join(root, "factory.json"));
  assert.ok("company" in read);
  return read.company.prototype;
};

async function until(done: () => boolean): Promise<void> {
  const stop = Date.now() + 60_000;
  while (!done()) {
    assert.ok(Date.now() < stop, "it did not happen in time");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const exploration = (on: ReturnType<typeof project>) => {
  const found = on.store.get("explorations", "X-1");
  assert.ok(found);
  return found;
};

const startSetUpOf = (on: ReturnType<typeof project>, key: string) => {
  const thing = on.store
    .board("X-1")
    .things.find((one) => one.kind === "prototype" && one.key === key);
  assert.ok(thing?.kind === "prototype");
  return thing.startSetUp === true;
};

test("Tinker's answer is read: its start, or its reason", () => {
  assert.deepEqual(startIn("Looked.\n\nStart: npm run dev"), {
    command: "npm run dev",
    reason: undefined,
  });
  assert.equal(startIn("`Start: a`\nStart: b").command, "b");
  assert.deepEqual(startIn("Could not start: it needs a licence file"), {
    command: undefined,
    reason: "it needs a licence file",
  });
  assert.deepEqual(startIn("Nothing useful"), {
    command: undefined,
    reason: undefined,
  });
});

test("the guide has Tinker make up logins and outside services, never ask", () => {
  const guide = startGuide();
  assert.match(guide, /Never stop for them, and never ask/);
  assert.match(guide, /A missing login is never a reason/);
  assert.match(guide, /Pick a free port by itself/);
});

test("a start that comes up is tried, then kept for the whole team; one that does not is not", async () => {
  const on = project();
  const mode = new PrototypeMode({
    project: on.folder,
    root: on.root,
    onChange: () => undefined,
    copyOf: (idea, key) =>
      versionCopy(on.folder, idea, key, `proto/${idea}-${key.toLowerCase()}`),
  });
  try {
    const up = await mode.trial("X-1", "A", SERVER);
    assert.deepEqual(up, { ok: true });
    const stopped = await mode.trial("X-1", "A", BROKEN);
    assert.ok(!stopped.ok);
    assert.match(stopped.why, /cannot load its pages/);
    // Said where it runs, but nothing answers there.
    const silent = await mode.trial(
      "X-1",
      "A",
      "echo FACTORY_URL=http://127.0.0.1:1; sleep 2",
    );
    assert.ok(!silent.ok);
    assert.match(silent.why, /nothing answered/);
    // Never says where it runs.
    const quiet = await mode.trial("X-1", "A", "sleep 5", 600);
    assert.ok(!quiet.ok);
    assert.match(quiet.why, /Nothing said where it runs/);
  } finally {
    mode.close();
  }
});

test("Tinker is told what failed and tries again, up to a few times, then gives its own reason", async () => {
  const on = project();
  const mode = new PrototypeMode({
    project: on.folder,
    root: on.root,
    onChange: () => undefined,
    copyOf: (idea, key) =>
      versionCopy(on.folder, idea, key, `proto/${idea}-${key.toLowerCase()}`),
  });
  const prompts: string[] = [];
  const answers = [
    `Start: ${BROKEN}`,
    `Start: ${BROKEN}`,
    `Start: ${BROKEN}\nCould not start: it stops while loading its pages.`,
    "never asked",
  ];
  try {
    const result = await setUpStart({
      root: on.root,
      project: on.folder,
      mode,
      exploration: "X-1",
      key: "A",
      ask: (prompt) => {
        prompts.push(prompt);
        return Promise.resolve({
          ok: true,
          text: answers[prompts.length - 1] ?? "",
        });
      },
    });
    assert.equal(prompts.length, ATTEMPTS);
    assert.match(prompts[1] ?? "", /cannot load its pages/);
    assert.deepEqual(result, { problem: "it stops while loading its pages." });
    assert.equal(companyStart(on.root), undefined);
  } finally {
    mode.close();
  }
});

test("while the first prototype is made, a start is worked out, checked and kept; the line is on that prototype only", async () => {
  const on = project();
  const claude = pretendClaude([
    { calls: [], reply: `Read it.\n\nStart: ${SERVER}` },
    { calls: [], reply: "Made A." },
    // It looks at its pictures, and answers again.
    { calls: [], reply: "Made A, looked." },
    { calls: [], reply: "Made B." },
    { calls: [], reply: "Made B, looked." },
  ]);
  const prototypes = prototypesOf(on, claude.claude);
  try {
    prototypes.change(exploration(on), "A", "a change");
    await until(() => !prototypes.mode.runOf("X-1", "A").making);
    assert.deepEqual(companyStart(on.root), { start: SERVER, by: "tinker" });
    assert.equal(startSetUpOf(on, "A"), true);
    assert.equal(prototypes.mode.runOf("X-1", "A").startProblem, null);
    // Tinker worked with the guide for starting, then made the prototype.
    assert.match(
      claude.seen[0]?.instructions ?? "",
      /Working out how to start/,
    );
    assert.match(claude.seen[1]?.prompt ?? "", /Make|Change prototype A/);
    assert.equal(prototypes.mode.runOf("X-1", "A").state, "running");

    // The next prototype uses what is kept: nothing is worked out again,
    // and it carries no line.
    prototypes.change(exploration(on), "B", "another change");
    await until(() => !prototypes.mode.runOf("X-1", "B").making);
    assert.equal(claude.seen.length, 5);
    assert.match(claude.seen[3]?.prompt ?? "", /prototype B/);
    assert.ok(
      !claude.seen.slice(3).some((one) => /start command/.test(one.prompt)),
    );
    assert.equal(startSetUpOf(on, "B"), false);
    assert.equal(startSetUpOf(on, "A"), true);
  } finally {
    prototypes.close();
  }
});

test("when Tinker cannot, the prototype says why, and Try again runs the steps once more", async () => {
  const on = project();
  const claude = pretendClaude([
    { calls: [], reply: "Could not start: it needs a licence nobody has." },
    { calls: [], reply: "Made A." },
    { calls: [], reply: `Start: ${SERVER}` },
  ]);
  const prototypes = prototypesOf(on, claude.claude);
  try {
    prototypes.change(exploration(on), "A", "a change");
    await until(() => !prototypes.mode.runOf("X-1", "A").making);
    const run = prototypes.mode.runOf("X-1", "A");
    assert.equal(run.startProblem, "it needs a licence nobody has.");
    assert.equal(run.state, "stopped");
    assert.equal(companyStart(on.root), undefined);
    assert.equal(startSetUpOf(on, "A"), false);

    // Try again: Start, as always; the steps show Tinker working, then it
    // starts like any prototype.
    const again = await prototypes.open("X-1", "A");
    assert.equal(again.state, "starting");
    assert.equal(again.start?.step, "setup");
    assert.equal(again.startProblem, null);
    await until(() => prototypes.mode.runOf("X-1", "A").state === "running");
    assert.deepEqual(companyStart(on.root), { start: SERVER, by: "tinker" });
    assert.equal(startSetUpOf(on, "A"), true);
    assert.equal(prototypes.mode.runOf("X-1", "A").startProblem, null);
  } finally {
    prototypes.close();
  }
});

test("a login nobody has never ends in the problem: Tinker is told to make one up", async () => {
  const on = project();
  const claude = pretendClaude([
    { calls: [], reply: `Start: ${SERVER}` },
    { calls: [], reply: "Made A." },
  ]);
  const prototypes = prototypesOf(on, claude.claude);
  try {
    prototypes.change(exploration(on), "A", "a change");
    await until(() => !prototypes.mode.runOf("X-1", "A").making);
    const told = claude.seen[0]?.instructions ?? "";
    assert.match(told, /Make them up/);
    assert.match(told, /never ask/);
    assert.equal(prototypes.mode.runOf("X-1", "A").startProblem, null);
  } finally {
    prototypes.close();
  }
});

test("a start Tinker worked out that stops working is worked out again; one the team wrote is left alone", async () => {
  const kept = project({ start: BROKEN, by: "tinker" });
  const claude = pretendClaude([{ calls: [], reply: `Start: ${SERVER}` }]);
  const prototypes = prototypesOf(kept, claude.claude);
  try {
    await prototypes.open("X-1", "A");
    await until(() => companyStart(kept.root)?.start === SERVER);
    assert.equal(companyStart(kept.root)?.by, "tinker");
    assert.match(claude.seen[0]?.prompt ?? "", /has stopped working/);
    assert.match(claude.seen[0]?.prompt ?? "", /cannot load its pages/);
    await until(() => prototypes.mode.runOf("X-1", "A").state === "running");
    assert.equal(startSetUpOf(kept, "A"), true);
  } finally {
    prototypes.close();
  }

  const theirs = project({ start: BROKEN });
  const other = pretendClaude([]);
  const left = prototypesOf(theirs, other.claude);
  try {
    await left.open("X-1", "A");
    await until(() => left.mode.runOf("X-1", "A").state === "failed");
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(other.seen.length, 0);
    assert.deepEqual(companyStart(theirs.root), { start: BROKEN });
  } finally {
    left.close();
  }
});
