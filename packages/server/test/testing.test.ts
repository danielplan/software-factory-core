import assert from "node:assert/strict";
import { cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { Claude } from "@software-factory/core";

import { standIn } from "./pretend-claude.ts";
import type { TestPage, TestRow } from "../src/extensions/testing/views.ts";
import { stage } from "./stage.ts";

// Testing through its routes: Mimic writes a persona's story and days, the
// persona lives them through a browser only and keeps a diary, and the
// analyst turns it into signals, each at its moment. A stand-in Claude Code
// answers each part, and stand-ins give the app and the browser.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

const DIARY = {
  steps: [
    {
      time: "19:00",
      did: "Opened the size guide",
      expected: "It shows the sizes",
      asExpected: false,
      note: "Nothing happened.",
      shot: "d1-1.png",
    },
    { did: "Went back", expected: "The shoes again", asExpected: true },
  ],
};

const DRAFT = {
  app: "office",
  title: "Noah's first week",
  story: "Noah runs in the mountains and buys his shoes online.",
  locale: "de-DE",
  timeZone: "Europe/Berlin",
  days: [{ title: "Saturday", situations: ["Needs new trail shoes"] }],
};

async function testFactory(
  claudeOf: (root: () => string) => Claude,
  app: (product: string | null) => Promise<string> = () =>
    Promise.resolve("http://localhost:5173"),
) {
  let root = "";
  let closed = 0;
  const staged = await stage(
    claudeOf(() => root),
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
    // Kobble's own extensions, Testing among them.
    true,
  );
  root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const finished = async (id: string) => {
    for (;;) {
      const page = await read<TestPage>(`/api/kobble/testing/test?id=${id}`);
      if (["done", "failed"].includes(page.test.status)) return page;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const start = async (body: unknown) => {
    const response = await staged.post("/api/kobble/testing", body);
    return {
      status: response.status,
      body: (await response.json()) as { test: { id: string }; error: string },
    };
  };
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return { ...staged, read, finished, start, close, closed: () => closed };
}

test("Mimic writes the story; the persona lives it and files what surprised them, each at its moment", async () => {
  const seen: Parameters<Claude["run"]>[0][] = [];
  const asked: (string | null)[] = [];
  const factory = await testFactory(
    (root) => ({
      run: (options) => {
        seen.push(options);
        const part = options.prompt.slice(0, 6);
        if (part === "Part 0")
          return Promise.resolve({ ok: true, text: JSON.stringify(DRAFT) });
        if (part === "Part 1") {
          options.onText?.("Step 1: Opening the size guide");
          writeFileSync(
            join(root(), "kobble", "test-shots", "T-0004", "d1-1.png"),
            "png",
          );
          return Promise.resolve({
            ok: true,
            text: `Here is my diary: ${JSON.stringify(DIARY)}`,
          });
        }
        return Promise.resolve({
          ok: true,
          text: JSON.stringify({
            signals: [
              {
                type: "bug",
                text: "The size guide does not open on my phone.",
                step: 1,
              },
              { type: "question", text: "Do these run small?", step: 9 },
            ],
          }),
        });
      },
    }),
    (product) => {
      asked.push(product);
      return Promise.resolve("http://localhost:5173");
    },
  );
  try {
    const { draft } = await factory.read<{
      draft: { product: string; app: string; title: string };
    }>("/api/kobble/testing/draft?persona=noah");
    assert.deepEqual(draft, {
      title: "Noah's first week",
      story: "Noah runs in the mountains and buys his shoes online.",
      days: DRAFT.days,
      product: "office",
      app: "Back office",
      locale: "de-DE",
      timeZone: "Europe/Berlin",
    });
    assert.match(seen[0]?.prompt ?? "", /^Part 0: write the story/);
    assert.match(seen[0]?.prompt ?? "", /You are Noah/);
    assert.match(seen[0]?.prompt ?? "", /- office: Back office/);

    const started = await factory.start({ persona: "noah", ...draft });
    assert.equal(started.status, 200);
    assert.equal(started.body.test.id, "T-0004");
    const page = await factory.finished("T-0004");
    assert.equal(page.test.status, "done");
    assert.equal(page.test.problem, null);
    assert.equal(page.test.title, "Noah's first week");
    assert.deepEqual(page.test.dayTitles, ["Saturday"]);
    assert.equal(page.test.persona?.name, "Noah");
    assert.deepEqual(page.test.moments, ["bug", "ok"]);
    assert.deepEqual(page.test.counts, { bug: 1, idea: 0, question: 1 });
    assert.deepEqual(asked, ["office"]);
    assert.deepEqual(
      page.moments.map((one) => [
        one.number,
        one.day,
        one.time,
        one.did,
        one.shot,
        one.signals.map((signal) => signal.type),
      ]),
      [
        [1, 1, "19:00", "Opened the size guide", "d1-1.png", ["bug"]],
        [2, 1, null, "Went back", null, []],
      ],
    );
    // A moment the diary does not have is filed for the whole test.
    assert.deepEqual(
      page.other.map((signal) => [signal.type, signal.text]),
      [["question", "Do these run small?"]],
    );
    // The persona agent has the browser and no tool of its own; the
    // analyst has nothing at all.
    const [, use, analyse] = seen;
    assert.ok(use && analyse);
    assert.equal(use.mcp?.name, "browser");
    assert.deepEqual(use.tools, []);
    assert.equal(use.readOnly, true);
    assert.match(use.prompt, /http:\/\/localhost:5173/);
    assert.equal(analyse.mcp, undefined);
    assert.match(analyse.prompt, /Opened the size guide/);
    assert.equal(factory.closed(), 1);

    const picture = await fetch(
      `${factory.base}/api/kobble/testing/shot?id=T-0004&name=d1-1.png`,
    );
    assert.equal(picture.headers.get("content-type"), "image/png");
    assert.equal(await picture.text(), "png");
    const missing = await fetch(
      `${factory.base}/api/kobble/testing/shot?id=T-0004&name=d9-9.png`,
    );
    assert.equal(missing.status, 409);

    const list = await factory.read<{
      tests: TestRow[];
      personas: { id: string }[];
    }>("/api/kobble/testing");
    assert.deepEqual(
      list.tests.map((one) => [one.id, one.title, one.days]),
      [
        ["T-0004", "Noah's first week", 1],
        [
          "T-0003",
          "Try “Bring it back by email”: fill the basket on the phone and pay on the laptop",
          1,
        ],
        [
          "T-0002",
          "Find a watering can and see what it costs with delivery",
          1,
        ],
        [
          "T-0001",
          "Fill the basket on the way home and pay later in the evening",
          1,
        ],
      ],
    );
    assert.ok(list.personas.some((one) => one.id === "noah"));
  } finally {
    factory.close();
  }
});

test("a test that cannot run says why", async () => {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  const factory = await testFactory(
    () => standIn(["no diary here", null]).claude,
    async () => {
      await opened;
      return "http://localhost:5173";
    },
  );
  try {
    const first = await factory.start({ persona: "mia", task: "Pay" });
    const again = await factory.start({ persona: "mia", task: "Pay again" });
    assert.equal(again.status, 409);
    assert.equal(again.body.error, "Mia is in a test already.");
    open();
    assert.equal(
      (await factory.finished(first.body.test.id)).test.problem,
      "The kobold's diary could not be read.",
    );
    const second = await factory.start({ persona: "mia", task: "Pay again" });
    assert.match(
      (await factory.finished(second.body.test.id)).test.problem ?? "",
      /^Claude Code could not run the test: spawn claude ENOENT/,
    );
    assert.equal(factory.closed(), 2);
    const none = await fetch(
      `${factory.base}/api/kobble/testing/test?id=T-0404`,
    );
    assert.equal(none.status, 409);
  } finally {
    factory.close();
  }
});

test("without an app to test, the test fails plainly", async () => {
  const factory = await testFactory(
    () => standIn([]).claude,
    () => Promise.reject(new Error("Tests need an app.")),
  );
  try {
    const started = await factory.start({ persona: "mia", task: "Pay" });
    const page = await factory.finished(started.body.test.id);
    assert.equal(page.test.status, "failed");
    assert.equal(page.test.problem, "Tests need an app.");
    assert.ok(page.test.ended);
    assert.equal(factory.closed(), 0);
  } finally {
    factory.close();
  }
});

test("a story Mimic cannot write says so", async () => {
  const factory = await testFactory(
    () => standIn(["not a story", null]).claude,
  );
  try {
    const unread = await fetch(
      `${factory.base}/api/kobble/testing/draft?persona=mia`,
    );
    assert.equal(unread.status, 409);
    assert.deepEqual(await unread.json(), {
      error: "The kobold's story could not be read.",
    });
    const failed = await fetch(
      `${factory.base}/api/kobble/testing/draft?persona=mia`,
    );
    assert.match(
      ((await failed.json()) as { error: string }).error,
      /^Claude Code could not run the test/,
    );
    const nobody = await fetch(
      `${factory.base}/api/kobble/testing/draft?persona=zoe`,
    );
    assert.deepEqual(await nobody.json(), {
      error: "There is no persona “zoe”.",
    });
  } finally {
    factory.close();
  }
});
