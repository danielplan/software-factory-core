import assert from "node:assert/strict";
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import { PersonaTests } from "../src/extensions/personas/persona-tests.ts";
import { standIn } from "./pretend-claude.ts";
import type { TestPage } from "../src/extensions/personas/views.ts";
import { stage } from "./stage.ts";
import { plugsOf } from "./plugs.ts";

// Persona tests: the persona agent uses the app through a browser only and
// keeps a diary; the analyst turns it into signals. A stand-in Claude Code
// answers each part, and stand-ins give the app and the browser.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

const DIARY = {
  steps: [
    {
      did: "Opened the size guide",
      expected: "It shows the sizes",
      asExpected: false,
      note: "Nothing happened.",
    },
    { did: "Went back", expected: "The shoes again", asExpected: true },
  ],
};

async function testFactory(
  answers: (string | null)[],
  app: (product: string | null) => Promise<string> = () =>
    Promise.resolve("http://localhost:5173"),
) {
  const { claude, seen } = standIn(answers);
  let closed = 0;
  const staged = await stage(
    claude,
    {},
    undefined,
    [],
    {
      apps: () => [
        { id: "shop", name: "Shop", does: "Where customers order" },
        {
          id: "office",
          name: "Back office",
          does: "Where the team keeps the shop",
        },
      ],
      app,
      browser: () =>
        Promise.resolve({
          url: "http://localhost:9/mcp",
          close: () => {
            closed += 1;
          },
        }),
    },
    // Kobble's own extensions, Personas among them.
    true,
  );
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  // The test once it is done or failed.
  const finished = async (id: string) => {
    for (;;) {
      const page = await read<TestPage>(`/api/kobble/test?id=${id}`);
      if (["done", "failed"].includes(page.test.status)) return page;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const start = async (body: unknown) => {
    const response = await staged.post("/api/kobble/tests", body);
    return {
      status: response.status,
      body: (await response.json()) as { test: { id: string }; error: string },
    };
  };
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return {
    ...staged,
    seen,
    read,
    finished,
    start,
    close,
    closed: () => closed,
  };
}

test("a mission uses the app as the persona and files what surprised them, each at its step", async () => {
  const asked: (string | null)[] = [];
  const factory = await testFactory(
    [
      `Step 1: Opening the size guide\nHere is my diary: ${JSON.stringify(DIARY)}`,
      JSON.stringify({
        signals: [
          {
            type: "bug",
            text: "The size guide does not open on my phone.",
            step: 1,
          },
          { type: "question", text: "Do these run small?", step: 9 },
        ],
      }),
    ],
    (product) => {
      asked.push(product);
      return Promise.resolve("http://localhost:5173");
    },
  );
  try {
    const started = await factory.start({
      persona: "noah",
      task: "Find the right size for trail shoes",
      product: "shop",
    });
    assert.equal(started.status, 200);
    assert.equal(started.body.test.id, "T-0004");
    const page = await factory.finished("T-0004");
    assert.equal(page.test.status, "done");
    assert.equal(page.test.problem, null);
    assert.deepEqual(page.test.steps, DIARY.steps);
    assert.deepEqual(page.test.signals, ["S-0004", "S-0005"]);
    assert.equal(page.test.doing, null);
    assert.equal(page.test.product, "shop");
    assert.deepEqual(asked, ["shop"]);
    assert.equal(page.persona.name, "Noah");
    assert.deepEqual(
      page.signals.map((s) => [s.type, s.source, s.persona, s.text, s.step]),
      [
        [
          "bug",
          "test",
          "noah",
          "The size guide does not open on my phone.",
          { test: "T-0004", number: 1, did: "Opened the size guide" },
        ],
        // A step the diary does not have is left out.
        ["question", "test", "noah", "Do these run small?", undefined],
      ],
    );
    // The persona agent has the browser and no tool of its own; the
    // analyst has nothing at all.
    const [use, analyse] = factory.seen;
    assert.ok(use && analyse);
    assert.equal(use.mcp?.name, "browser");
    assert.deepEqual(use.tools, []);
    assert.equal(use.readOnly, true);
    assert.match(use.prompt, /You are Noah/);
    assert.match(use.prompt, /http:\/\/localhost:5173/);
    assert.equal(analyse.mcp, undefined);
    assert.match(analyse.prompt, /Opened the size guide/);
    assert.equal(factory.closed(), 1);
    const { tests } = await factory.read<{ tests: { id: string }[] }>(
      "/api/kobble/tests?persona=noah",
    );
    assert.deepEqual(
      tests.map((t) => t.id),
      ["T-0004"],
    );
  } finally {
    factory.close();
  }
});

test("a mission that cannot run says why; a persona goes on one mission at a time", async () => {
  // The app starts only when the second try was refused.
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  const factory = await testFactory(["no diary here", null], async () => {
    await opened;
    return "http://localhost:5173";
  });
  try {
    const first = await factory.start({ persona: "mia", task: "Pay" });
    const again = await factory.start({ persona: "mia", task: "Pay again" });
    assert.equal(again.status, 409);
    assert.equal(again.body.error, "Mia is on a mission already.");
    open();
    assert.equal(
      (await factory.finished(first.body.test.id)).test.problem,
      "The kobold's diary could not be read.",
    );
    const second = await factory.start({ persona: "mia", task: "Pay again" });
    assert.match(
      (await factory.finished(second.body.test.id)).test.problem ?? "",
      /^Claude Code could not run the mission: spawn claude ENOENT/,
    );
    assert.equal(factory.closed(), 2);
  } finally {
    factory.close();
  }
});

test("without an app to test, the test fails plainly", async () => {
  const factory = await testFactory([], () =>
    Promise.reject(new Error("Missions need an app.")),
  );
  try {
    const started = await factory.start({ persona: "mia", task: "Pay" });
    const page = await factory.finished(started.body.test.id);
    assert.equal(page.test.status, "failed");
    assert.equal(page.test.problem, "Missions need an app.");
    assert.ok(page.test.ended);
    assert.equal(factory.closed(), 0);
  } finally {
    factory.close();
  }
});

test("a test needs a persona and a task", async () => {
  const factory = await testFactory([]);
  try {
    assert.equal(
      (await factory.start({ persona: "mia", task: " " })).body.error,
      "Say what the persona should try.",
    );
    assert.equal(
      (await factory.start({ persona: "zoe", task: "Pay" })).body.error,
      "There is no persona “zoe”.",
    );
    const none = await fetch(`${factory.base}/api/kobble/test?id=T-0404`);
    assert.equal(none.status, 409);
  } finally {
    factory.close();
  }
});

test("a test left running when the factory stopped says it did not finish", () => {
  const folder = mkdtempSync(join(tmpdir(), "tests-"));
  cpSync(join(ACME, "factory", "kobble"), join(folder, "kobble"), {
    recursive: true,
  });
  const store = new KobbleStore(folder);
  const done = store.get("tests", "T-0001");
  assert.ok(done);
  store.put("tests", { ...done, id: "T-0009", status: "running", ended: null });
  const tests = new PersonaTests({
    claude: standIn([]).claude,
    cwd: folder,
    store: () => store,
    signals: () => plugsOf(store).signals,
    app: () => Promise.resolve(""),
    browser: () => Promise.reject(new Error("none")),
    onChange: () => {},
    now: () => new Date("2026-11-17T10:00:00.000Z"),
  });
  tests.recover();
  const left = store.get("tests", "T-0009");
  assert.ok(left);
  assert.equal(left.status, "failed");
  assert.equal(left.ended, "2026-11-17T10:00:00.000Z");
  assert.equal(
    left.problem,
    "The factory stopped before the mission finished.",
  );
  assert.equal(store.get("tests", "T-0001")?.status, "done");
});
