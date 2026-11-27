import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { type Claude, KobbleStore } from "@software-factory/core";

import { browserOptions } from "../src/kobble/browser.ts";
import { testPage } from "../src/extensions/testing/views.ts";
import { stepNow } from "../src/extensions/testing/prompts.ts";
import { TestRuns } from "../src/extensions/testing/runs.ts";
import { standIn } from "./pretend-claude.ts";
import { plugsOf } from "./plugs.ts";

// Tests before launch, the runner alone: several at once, a few at a time,
// the moment each persona is at as they go, their days one after another,
// the pictures of the screens, and tests written before tests had days.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

function acmeStore(): { folder: string; store: KobbleStore } {
  const folder = mkdtempSync(join(tmpdir(), "test-runs-"));
  cpSync(join(ACME, "factory", "kobble"), join(folder, "kobble"), {
    recursive: true,
  });
  return { folder, store: new KobbleStore(folder) };
}

const DIARY = JSON.stringify({
  steps: [{ did: "Opened the shop", expected: "Tools", asExpected: true }],
});

const DAYS = [{ title: "Monday", situations: ["Order gloves"] }];

function runsOf(
  store: KobbleStore,
  folder: string,
  more: Partial<ConstructorParameters<typeof TestRuns>[0]> = {},
) {
  const plugs = plugsOf(store);
  return new TestRuns({
    claude: standIn([]).claude,
    cwd: folder,
    store: () => store,
    personas: () => plugs.personas,
    signals: () => plugs.signals,
    apps: () => [],
    app: () => Promise.resolve("http://localhost:5173"),
    browser: () => Promise.resolve({ url: "http://localhost:9", close() {} }),
    onChange: () => {},
    ...more,
  });
}

// A Claude Code whose persona agents finish only when told to, so a check
// sees tests while they run; it says the moment it is at right away.
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

test("several tests run at once, a few at a time; the others wait", async () => {
  const { folder, store } = acmeStore();
  const { claude, held } = heldClaude();
  const runs = runsOf(store, folder, { claude, atOnce: 2 });
  const ids = ["mia", "noah", "bruno"].map(
    (persona) => runs.start({ persona, title: "Gloves", days: DAYS }).id,
  );
  const status = () => ids.map((id) => store.get("tests", id)?.status);
  await until(() => held.length === 2);
  assert.deepEqual(status(), ["running", "running", "queued"]);
  // The moment each is at, with its day, as it goes.
  assert.equal(
    store.get("tests", ids[0] ?? "")?.doing,
    "Day 1 · Step 1: Opening the shop",
  );
  held.shift()?.();
  await until(() => held.length === 2);
  assert.deepEqual(status(), ["done", "running", "running"]);
  assert.equal(store.get("tests", ids[0] ?? "")?.doing, null);
  held.shift()?.();
  held.shift()?.();
  await runs.settled();
  assert.deepEqual(status(), ["done", "done", "done"]);
});

test("the app two tests need at once is started once", async () => {
  const { folder, store } = acmeStore();
  let starts = 0;
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  const runs = runsOf(store, folder, {
    claude: standIn([DIARY, '{"signals":[]}', DIARY, '{"signals":[]}']).claude,
    app: async () => {
      starts += 1;
      await opened;
      return "http://localhost:5173";
    },
  });
  runs.start({ persona: "mia", task: "Pay" });
  runs.start({ persona: "noah", task: "Pay" });
  await new Promise((resolve) => setTimeout(resolve, 10));
  open();
  await runs.settled();
  assert.equal(starts, 1);
});

test("the days are lived one after another, each knowing the days before, with the pictures there are", async () => {
  const { folder, store } = acmeStore();
  const prompts: string[] = [];
  const wishes: unknown[] = [];
  const claude: Claude = {
    run: (options) => {
      prompts.push(options.prompt);
      if (options.prompt.startsWith("Part 2"))
        return Promise.resolve({ ok: true, text: '{"signals":[]}' });
      const day = prompts.length;
      // The browser saved the first day's picture; the second names one
      // it never took.
      if (day === 1)
        writeFileSync(join(store.testShots("T-0004"), "d1-1.png"), "png");
      return Promise.resolve({
        ok: true,
        text: JSON.stringify({
          steps: [
            {
              time: day === 1 ? "19:00" : null,
              did: `Day ${String(day)} work`,
              expected: "It works",
              asExpected: true,
              note: day === 1 ? "That's how I work." : undefined,
              shot: `d${String(day)}-1.png`,
            },
          ],
        }),
      });
    },
  };
  const runs = runsOf(store, folder, {
    claude,
    browser: (wish) => {
      wishes.push(wish);
      return Promise.resolve({ url: "http://localhost:9", close() {} });
    },
  });
  const started = runs.start({
    persona: "mia",
    title: "Mia's first week",
    story: "Mia gardens on weekends.",
    days: [
      { title: "Monday", situations: ["Sets up the shop"] },
      { title: "", situations: ["Orders gloves"] },
    ],
    locale: "it-IT",
    timeZone: "Europe/Rome",
  });
  await runs.settled();
  const done = store.get("tests", started.id);
  assert.equal(done?.status, "done");
  assert.deepEqual(
    done.steps.map((step) => [step.day, step.time, step.did, step.shot]),
    [
      [1, "19:00", "Day 1 work", "d1-1.png"],
      [2, null, "Day 2 work", null],
    ],
  );
  assert.equal(done.steps[0]?.note, "That's how I work.");
  assert.deepEqual(wishes, [
    {
      shots: join(folder, "kobble", "test-shots", "T-0004"),
      locale: "it-IT",
      timeZone: "Europe/Rome",
    },
  ]);
  assert.match(prompts[0] ?? "", /Day 1 of 2: Monday/);
  assert.match(prompts[0] ?? "", /Mia gardens on weekends\./);
  assert.match(prompts[0] ?? "", /This is your first day with the app\./);
  assert.match(prompts[0] ?? "", /d1-1\.png/);
  assert.match(prompts[1] ?? "", /Day 2 of 2\. What happens:\n- Orders gloves/);
  assert.match(prompts[1] ?? "", /- Day 1: Day 1 work/);
  assert.match(
    readFileSync(join(folder, ".gitignore"), "utf8"),
    /kobble\/test-shots\//,
  );
  assert.equal(store.testShotFile("T-0004", "d1-1.png") !== null, true);
  assert.equal(store.testShotFile("T-0004", "../d1-1.png"), null);
  assert.equal(store.testShotFile("mia", "d1-1.png"), null);
});

test("a persona stuck on a day lives no more days; what the browser reported goes to the analyst", async () => {
  const { folder, store } = acmeStore();
  const prompts: string[] = [];
  const claude: Claude = {
    run: (options) => {
      prompts.push(options.prompt);
      if (options.prompt.startsWith("Part 2"))
        return Promise.resolve({ ok: true, text: '{"signals":[]}' });
      const shots = store.testShots("T-0004");
      writeFileSync(
        join(shots, "console-1.log"),
        [
          "[   1200ms] [LOG] Opened",
          "[  19478ms] [ERROR] Failed to load resource: 401 @ /api/sign-in",
          "[  19480ms] [ERROR] Failed to load resource: 401 @ /api/sign-in",
        ].join("\n"),
      );
      return Promise.resolve({
        ok: true,
        text: JSON.stringify({
          stuck: true,
          steps: [
            {
              did: "Tried to sign in",
              expected: "My account",
              asExpected: false,
            },
          ],
        }),
      });
    },
  };
  const runs = runsOf(store, folder, { claude });
  runs.start({
    persona: "mia",
    title: "Mia's week",
    days: [
      { title: "Monday", situations: ["Signs in"] },
      { title: "Tuesday", situations: ["Orders gloves"] },
    ],
  });
  await runs.settled();
  const done = store.get("tests", "T-0004");
  assert.equal(done?.status, "done");
  assert.equal(done.stuck, 1);
  assert.deepEqual(done.errors, [
    { day: 1, text: "Failed to load resource: 401 @ /api/sign-in" },
  ]);
  // Day 1 and the analyst: Tuesday was not lived.
  assert.equal(prompts.length, 2);
  assert.match(prompts[1] ?? "", /Day 1: Failed to load resource: 401/);
  // A moment that surprised the persona, with nothing filed at it.
  const page = testPage(store, "T-0004", store.all("personas"), []);
  assert.deepEqual(page.test.moments, ["surprise"]);
  assert.equal(page.test.stuck, 1);
});

test("a test needs a persona and what happens on their days; one at a time for each", () => {
  const { folder, store } = acmeStore();
  const runs = runsOf(store, folder, {
    app: () => new Promise(() => {}),
  });
  assert.throws(
    () => runs.start({ persona: "zoe", task: "Pay" }),
    /There is no persona “zoe”\./,
  );
  assert.throws(
    () => runs.start({ persona: "mia", days: [] }),
    /Say what happens to the persona on their days\./,
  );
  assert.throws(() => runs.start("nonsense"), /There is no persona “”\./);
  const one = runs.start({ persona: "mia", task: "Pay" });
  // A task alone is a test of one day, titled by it, with who they are as
  // the story.
  assert.equal(one.title, "Pay");
  assert.deepEqual(one.days, [{ title: "", situations: ["Pay"] }]);
  assert.match(one.story, /^You are Mia/);
  assert.equal(
    runs.start({ persona: "noah", days: DAYS }).title,
    "Noah's test",
  );
  assert.throws(
    () => runs.start({ persona: "mia", task: "Pay again" }),
    /Mia is in a test already\./,
  );
});

test("a test left running when the factory stopped says it did not finish", () => {
  const { folder, store } = acmeStore();
  const done = store.get("tests", "T-0001");
  assert.ok(done);
  store.put("tests", { ...done, id: "T-0009", status: "running", ended: null });
  const runs = runsOf(store, folder, {
    now: () => new Date("2026-11-17T10:00:00.000Z"),
  });
  runs.recover();
  const left = store.get("tests", "T-0009");
  assert.equal(left?.status, "failed");
  assert.equal(left.ended, "2026-11-17T10:00:00.000Z");
  assert.equal(left.problem, "The factory stopped before the test finished.");
  assert.equal(store.get("tests", "T-0001")?.status, "done");
});

test("a test written before tests had days reads as one day with its task", () => {
  const { store } = acmeStore();
  writeFileSync(
    join(store.root, "tests", "T-0008.json"),
    JSON.stringify({
      id: "T-0008",
      persona: "mia",
      task: "Pay for the gloves",
      on: "main",
      status: "done",
      started: null,
      ended: null,
      steps: [{ did: "Paid", expected: "A receipt", asExpected: true }],
      signals: [],
      problem: null,
    }),
  );
  const old = store.get("tests", "T-0008");
  assert.equal(old?.title, "Pay for the gloves");
  assert.equal(old.story, "");
  assert.deepEqual(old.days, [
    { title: "", situations: ["Pay for the gloves"] },
  ]);
  assert.equal(old.steps[0]?.day, 1);
});

test("the moment a persona is at is the last Step line written so far", () => {
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

test("the browser keeps a test's pictures in its folder, in the persona's language and time zone", () => {
  assert.deepEqual(browserOptions({}), []);
  const shots = mkdtempSync(join(tmpdir(), "shots-"));
  assert.deepEqual(browserOptions({ shots }), ["--output-dir", shots]);
  const config = join(shots, "browser.json");
  assert.equal(existsSync(config), false);
  assert.deepEqual(
    browserOptions({ shots, locale: "it-IT", timeZone: "Europe/Rome" }),
    ["--output-dir", shots, "--config", config],
  );
  assert.deepEqual(JSON.parse(readFileSync(config, "utf8")), {
    browser: {
      contextOptions: { locale: "it-IT", timezoneId: "Europe/Rome" },
    },
  });
});
