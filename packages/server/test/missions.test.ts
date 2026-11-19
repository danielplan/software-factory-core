import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { type Claude, KobbleStore } from "@software-factory/core";

import { PersonaTests, stepNow } from "../src/kobble/persona-tests.ts";
import { standIn } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// Missions (persona tests) before launch: several at once, a few at a
// time, the step each persona is on as it goes, and the mission the kobold
// suggests.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

function acmeStore(): { folder: string; store: KobbleStore } {
  const folder = mkdtempSync(join(tmpdir(), "missions-"));
  cpSync(join(ACME, "factory", "kobble"), join(folder, "kobble"), {
    recursive: true,
  });
  return { folder, store: new KobbleStore(folder) };
}

const DIARY = JSON.stringify({
  steps: [{ did: "Opened the shop", expected: "Tools", asExpected: true }],
});

// A Claude Code whose persona agents finish only when told to, so a check
// sees missions while they run; it says the step it is on right away.
function heldClaude() {
  const held: (() => void)[] = [];
  const claude: Claude = {
    run: (options) => {
      if (!options.prompt.startsWith("Part 1"))
        return Promise.resolve({ ok: true, text: '{"signals":[]}' });
      options.onText?.("Step 1: Opening the shop");
      return new Promise((resolve) => {
        held.push(() => {
          resolve({ ok: true, text: DIARY });
        });
      });
    },
  };
  return { claude, held };
}

const until = async (ok: () => boolean) => {
  while (!ok()) await new Promise((resolve) => setTimeout(resolve, 5));
};

test("several missions run at once, a few at a time; the others wait", async () => {
  const { folder, store } = acmeStore();
  const { claude, held } = heldClaude();
  const missions = new PersonaTests({
    claude,
    cwd: folder,
    store: () => store,
    app: () => Promise.resolve("http://localhost:5173"),
    browser: () => Promise.resolve({ url: "http://localhost:9", close() {} }),
    onChange: () => {},
    atOnce: 2,
  });
  const ids = ["mia", "noah", "bruno"].map(
    (persona) => missions.start({ persona, task: "Order gloves" }).id,
  );
  const status = () => ids.map((id) => store.get("tests", id)?.status);
  await until(() => held.length === 2);
  assert.deepEqual(status(), ["running", "running", "queued"]);
  // The step each is on, as it goes.
  assert.equal(
    store.get("tests", ids[0] ?? "")?.doing,
    "Step 1: Opening the shop",
  );
  held.shift()?.();
  await until(() => held.length === 2);
  assert.deepEqual(status(), ["done", "running", "running"]);
  assert.equal(store.get("tests", ids[0] ?? "")?.doing, null);
  held.shift()?.();
  held.shift()?.();
  await missions.settled();
  assert.deepEqual(status(), ["done", "done", "done"]);
});

test("the app two missions need at once is started once", async () => {
  const { folder, store } = acmeStore();
  let starts = 0;
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  const missions = new PersonaTests({
    claude: standIn([DIARY, '{"signals":[]}', DIARY, '{"signals":[]}']).claude,
    cwd: folder,
    store: () => store,
    app: async () => {
      starts += 1;
      await opened;
      return "http://localhost:5173";
    },
    browser: () => Promise.resolve({ url: "http://localhost:9", close() {} }),
    onChange: () => {},
  });
  missions.start({ persona: "mia", task: "Pay" });
  missions.start({ persona: "noah", task: "Pay" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  open();
  await missions.settled();
  assert.equal(starts, 1);
});

test("the step a persona is on is the last Step line written so far", () => {
  assert.equal(
    stepNow("I will look.\nStep 1: Opening the shop"),
    "Step 1: Opening the shop",
  );
  assert.equal(
    stepNow("Step 1: Opening the shop\nIt opened.\nStep 2:  Choosing a slot "),
    "Step 2: Choosing a slot",
  );
  assert.equal(stepNow("Nothing yet"), null);
});

test("the kobold suggests one mission for a persona, in one of the apps, until it is sent", async () => {
  const { claude, seen } = standIn([
    JSON.stringify({ app: "office", mission: "Move a delivery to tomorrow." }),
    "not an idea",
    JSON.stringify({ app: "elsewhere", mission: "Pay for the gloves." }),
  ]);
  const staged = await stage(claude, {}, undefined, [], {
    apps: () => [
      { id: "shop", name: "Shop", does: "where customers order" },
      {
        id: "office",
        name: "Back office",
        does: "where the team keeps the shop",
      },
    ],
    app: () => new Promise(() => {}),
    browser: () => Promise.reject(new Error("none")),
  });
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const ask = async (persona: string, again = "") => {
    const response = await fetch(
      `${staged.base}/api/kobble/mission?persona=${persona}${again}`,
    );
    return {
      status: response.status,
      body: (await response.json()) as {
        mission: { task: string; product: string | null; app: string | null };
        error: string;
      },
    };
  };
  try {
    const first = await ask("mia");
    assert.deepEqual(first.body.mission, {
      task: "Move a delivery to tomorrow.",
      product: "office",
      app: "Back office",
    });
    // The same one again, without asking the kobold.
    assert.deepEqual((await ask("mia")).body.mission, first.body.mission);
    assert.equal(seen.length, 1);
    const [asked] = seen;
    assert.match(asked?.prompt ?? "", /^Part 0: suggest a mission/);
    assert.match(asked?.prompt ?? "", /You are Mia/);
    assert.match(asked?.prompt ?? "", /- office: Back office/);
    // Sent: the next suggestion is a new one; one that cannot be read says
    // so, until it is asked for again on purpose.
    await staged.post("/api/kobble/tests", {
      persona: "mia",
      task: first.body.mission.task,
      product: "office",
    });
    const unread = await ask("mia");
    assert.equal(unread.status, 409);
    assert.equal(unread.body.error, "The kobold's mission could not be read.");
    assert.equal((await ask("mia")).status, 409);
    assert.equal(seen.length, 2);
    const next = await ask("mia", "&again=yes");
    assert.deepEqual(next.body.mission, {
      task: "Pay for the gloves.",
      product: "shop",
      app: "Shop",
    });
    assert.match(seen[2]?.prompt ?? "", /- Move a delivery to tomorrow\./);
    assert.equal((await ask("zoe")).body.error, "There is no persona “zoe”.");
  } finally {
    staged.session.close();
    staged.server.close();
  }
});
