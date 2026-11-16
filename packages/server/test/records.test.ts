import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { RECORDS_FILE, SEED_FILE } from "@software-factory/core";

import type {
  PersonaPage,
  RecordsView,
  StoryPage,
  UnderstandOverview,
} from "../src/records/views.ts";
import { topCommand } from "../src/top-commands.ts";
import { stage } from "./stage.ts";

// The records as the server serves them: read for the Understand pages,
// signals brought in, each change told on the page's stream; and
// `software-factory check`.

const ACME_SEED = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "acme",
  "factory",
  SEED_FILE,
);

// A factory made with the example company's seed in its folder.
async function seededFactory(seed = ACME_SEED) {
  const staged = await stage();
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  copyFileSync(seed, join(root, SEED_FILE));
  const read = async (path: string) => {
    const response = await fetch(`${staged.base}${path}`);
    return {
      status: response.status,
      body: (await response.json()) as unknown,
    };
  };
  return { ...staged, root, read };
}

test("in setup there are no records yet", async () => {
  const { session, server, base, post } = await stage();
  try {
    const response = await fetch(`${base}/api/understand`);
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      error: "There is no factory yet: its records come with it.",
    });
    assert.equal(
      (await post("/api/signals", { source: "sup", text: "Hi" })).status,
      409,
    );
  } finally {
    session.close();
    server.close();
  }
});

test("the Understand pages read the records, with what is worked out from them", async () => {
  const { session, server, read } = await seededFactory();
  try {
    const everything = (await read("/api/records")).body as RecordsView;
    assert.equal(everything.records.stories.length, 10);
    assert.equal(everything.derived.problems.slotsP, "solved");

    const overview = (await read("/api/understand")).body as UnderstandOverview;
    assert.deepEqual(
      overview.personas.map((p) => [p.persona.name, p.summary.stories]),
      [
        ["Mia", 2],
        ["Bruno", 4],
        ["Noah", 2],
        ["Ines", 1],
      ],
    );
    const mia = overview.personas[0]!;
    assert.deepEqual(
      mia.realProblems.map((r) => r.id),
      ["r_mia"],
    );
    assert.deepEqual(mia.stories[1], {
      id: "st2",
      title: "Ordering after dinner",
      persona: "mia",
      starts: "Ordering at 21:00, after dinner",
      wants: "Delivery tomorrow evening",
      problem: "slotsP",
      problemTitle: "Tomorrow’s delivery slots are gone",
      problemState: "solved",
      known: { seen: 2, of: 3 },
      seen: [false, true, true],
      ended: true,
      isNew: false,
      wrong: null,
      from: { signals: 1 },
      trying: { exploring: [], inBuild: [] },
    });
    assert.equal(mia.stories[2]?.problemState, null);
    // What is tried for a problem: the ideas explored, the issues in Build.
    const trying = new Map(
      overview.personas.flatMap((p) => p.stories).map((s) => [s.id, s.trying]),
    );
    assert.deepEqual(trying.get("st1"), {
      exploring: ["Wish list", "Evening reminder"],
      inBuild: [],
    });
    assert.deepEqual(trying.get("st4"), { exploring: [], inBuild: [131] });
    assert.deepEqual(trying.get("st3"), { exploring: [], inBuild: [] });

    const bruno = (await read("/api/understand/persona?id=bruno"))
      .body as PersonaPage;
    assert.deepEqual(
      bruno.customers.map((c) => c.name),
      ["Bäckerei Rossi", "Café Nord"],
    );
    const invoice = bruno.problems.find((p) => p.id === "invoice");
    assert.deepEqual(
      [invoice?.state, invoice?.signals],
      ["open", ["s4", "s5"]],
    );

    const story = (await read("/api/understand/story?id=st1"))
      .body as StoryPage;
    assert.equal(story.persona.name, "Mia");
    assert.deepEqual(story.known, { seen: 4, of: 5 });
    assert.equal(story.problem?.state, "beingSolved");
    assert.deepEqual(story.trying, {
      exploring: ["Wish list", "Evening reminder"],
      inBuild: [],
    });
    assert.deepEqual(
      story.signals.map((s) => [s.id, s.sourceName]),
      [
        ["s1", "Feedback button"],
        ["s2", "Interviews"],
        ["s3", "How people use it"],
      ],
    );
    assert.deepEqual(
      story.ideas.map((i) => [i.id, i.state]),
      [
        ["wish", "exploring"],
        ["remind", "exploring"],
      ],
    );
    // A story written from an idea shows that idea; a wrong one, no problem.
    const pickup = (await read("/api/understand/story?id=st3"))
      .body as StoryPage;
    assert.deepEqual(
      [pickup.problem, pickup.trying, pickup.ideas.map((i) => i.state)],
      [null, { exploring: [], inBuild: [] }, ["didntWork"]],
    );

    for (const [path, error] of [
      ["/api/understand/persona", "Say which persona."],
      ["/api/understand/persona?id=zoe", "There is no persona “zoe”."],
      ["/api/understand/story?id=st99", "There is no story “st99”."],
    ] as const)
      assert.deepEqual(await read(path), { status: 409, body: { error } });
  } finally {
    session.close();
    server.close();
  }
});

test("a signal comes in through the import API, checked, and the page's stream tells which", async () => {
  const { session, server, base, post } = await seededFactory();
  const events = await fetch(`${base}/api/events`);
  const stream = events.body!.getReader();
  try {
    // Only the factory's page, or a program that sends its header.
    const signal = {
      source: "sup",
      text: "Can I pay by invoice?",
      who: "nord",
    };
    assert.equal((await post("/api/signals", signal, false)).status, 403);

    const answer = await post("/api/signals", { ...signal, id: "s19" });
    assert.equal(answer.status, 200);
    assert.deepEqual(await answer.json(), {
      signal: {
        id: "s19",
        source: "sup",
        text: "Can I pay by invoice?",
        who: "nord",
        when: "",
        sortedAs: "unsure",
        soundsLike: null,
        why: "",
        by: "kobold",
        wentTo: null,
      },
    });
    let told = "";
    while (!told.includes("records-changed")) {
      const { value } = await stream.read();
      told += new TextDecoder().decode(value);
    }
    assert.match(
      told,
      /event: records-changed\ndata: {"changes":\[{"kind":"signals","keys":\["s19"\]}\]}/,
    );

    // Without an id it gets one; what does not fit is refused, with why.
    const fresh = (await (
      await post("/api/signals", { source: "err", text: "Timeout", n: 3 })
    ).json()) as { signal: { id: string } };
    assert.match(fresh.signal.id, /^[0-9a-f-]{36}$/);
    const refused = async (body: unknown) =>
      ((await (await post("/api/signals", body)).json()) as { error: string })
        .error;
    assert.equal(
      await refused({ ...signal, id: "s19" }),
      "There is a signal “s19” already.",
    );
    assert.match(
      await refused({ source: "sup" }),
      /^This signal does not fit: /,
    );
    assert.match(
      await refused({ ...signal, sortedAs: "need" }),
      /Unrecognized key: "sortedAs"/,
    );
    assert.equal(
      await refused({ id: "s21", source: "sup", text: "Again", n: 2 }),
      "Signal s21: only machine errors are counted: a signal from people stays single.",
    );
  } finally {
    await stream.cancel();
    session.close();
    server.close();
  }
});

test("a seed that does not fit is said when the records are asked for", async () => {
  const folder = mkdtempSync(join(tmpdir(), "seed-"));
  const seed = join(folder, SEED_FILE);
  writeFileSync(seed, JSON.stringify({ personas: [{ id: "mia" }] }));
  const { session, server, read } = await seededFactory(seed);
  try {
    const { status, body } = await read("/api/understand");
    assert.equal(status, 409);
    assert.match(
      (body as { error: string }).error,
      /^The records cannot be opened: kobble-seed\.json: it does not fit: /,
    );
  } finally {
    session.close();
    server.close();
  }
});

test("software-factory check says what breaks the records' rules", async () => {
  const lines: string[] = [];
  const check = (args: string[], from: string) => {
    lines.length = 0;
    return topCommand(["check", ...args], from, (line) => lines.push(line));
  };
  const outside = mkdtempSync(join(tmpdir(), "none-"));
  assert.equal(await check([], outside), 1);
  assert.deepEqual(lines, ["There is no factory here: run it in a project."]);

  const { session, server, root, project, read } = await seededFactory();
  assert.equal(await check([], project), 0);
  assert.deepEqual(lines, [
    "The records hold (kobble-seed.json): every rule is kept.",
  ]);
  // Once the records are read, the database is there too.
  assert.equal((await read("/api/understand")).status, 200);
  session.close();
  server.close();
  assert.equal(await check([], project), 0);
  assert.deepEqual(lines, [
    `The records hold (${RECORDS_FILE}, ${SEED_FILE}): every rule is kept.`,
  ]);

  writeFileSync(
    join(root, SEED_FILE),
    JSON.stringify({
      customers: [{ id: "lisa", name: "Lisa", persona: "mia" }],
    }),
  );
  assert.equal(await check(["."], project), 1);
  assert.deepEqual(lines, [
    "kobble-seed.json: Customer lisa: its persona “mia” is not there.",
    "\n1 problem(s) in the records.",
  ]);

  const empty = await stage();
  empty.session.createCompany({ name: "Empty", about: "" });
  empty.session.close();
  empty.server.close();
  assert.equal(await check([], empty.project), 0);
  assert.deepEqual(lines, ["There are no records yet: nothing to check."]);
});
