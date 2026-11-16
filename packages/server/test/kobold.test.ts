import assert from "node:assert/strict";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  type Claude,
  RECORDS_FILE,
  RecordStore,
  SEED_FILE,
} from "@software-factory/core";

import type { KoboldJob } from "../src/kobold/kobold.ts";
import type { SignalView } from "../src/records/signal-views.ts";
import type {
  PersonaPage,
  RecordsView,
  StoryPage,
  UnderstandOverview,
} from "../src/records/views.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// The kobold's Understand jobs, with a pretend Claude Code that calls its
// tools over MCP as the real one does: a signal that comes in is sorted
// and put in its place, a real problem is suggested when a persona's new
// problem joins another, a question is drafted for guessed scenes; and
// what a person does: Move, Looks good, Confirm, a new source.

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

// What the server answers a button with, in these tests.
type Said = {
  error: string;
  done: string;
  question: string;
  job: KoboldJob;
  source: { id: string };
  signal: { id: string };
};

async function koboldFactory(claude: Claude) {
  const staged = await stage(claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  copyFileSync(ACME_SEED, join(root, SEED_FILE));
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const send = async (path: string, body: unknown) => {
    const response = await staged.post(path, body);
    return { status: response.status, body: (await response.json()) as Said };
  };
  // The jobs once none of them works any more.
  const settled = async () => {
    for (;;) {
      const { jobs } = await read<{ jobs: KoboldJob[] }>(
        "/api/understand/kobold",
      );
      if (!jobs.some((job) => job.working)) return jobs;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const records = async () => (await read<RecordsView>("/api/records")).records;
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return { ...staged, root, read, send, settled, records, close };
}

test("a signal that comes in is sorted by the kobold into a scene of a story, which is seen then", async () => {
  const pretend = pretendClaude([
    {
      calls: [
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: "bruno",
            why: "Wrong persona first.",
            place: { to: "scene", story: "st7", scene: 1 },
          },
        ],
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: "noah",
            why: "A first order, unsure about the size.",
            place: { to: "scene", story: "st7", scene: 3 },
          },
        ],
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: "noah",
            why: "A first order, unsure about the size.",
            place: { to: "scene", story: "st7", scene: 1 },
          },
        ],
      ],
      reply: "Sorted.",
    },
  ]);
  const factory = await koboldFactory(pretend.claude);
  try {
    const sent = await factory.send("/api/signals", {
      source: "sup",
      id: "s19",
      text: "Do these shoes run small?",
    });
    assert.equal(sent.status, 200);
    const [job] = await factory.settled();
    assert.deepEqual(
      [job?.kind, job?.about, job?.done, job?.problem],
      [
        "sort",
        "s19",
        "It is evidence in scene 1 of “Choosing a size”, which is seen now.",
        null,
      ],
    );
    // Each refusal was said to the kobold, so it could correct itself.
    assert.deepEqual(pretend.answers[0]?.slice(0, 2), [
      "The story “Choosing a size” is noah's: only a signal that sounds like noah is evidence in it.",
      "The story “Choosing a size” has 2 scenes.",
    ]);
    const [run] = pretend.seen;
    assert.ok(run);
    assert.equal(run.readOnly, true);
    assert.equal(run.mcp?.name, "kobold");
    assert.match(run.instructions ?? "", /## Sorting a signal/);
    assert.match(
      run.prompt,
      /from “Support” \(people\):\nDo these shoes run small\?/,
    );
    assert.match(run.prompt, / {2}1\. \[guessed\] /);
    assert.match(run.prompt, / {2}2\. \[seen, breaks here\] /);

    const signal = await factory.read<SignalView>(
      "/api/understand/signal?id=s19",
    );
    assert.deepEqual(
      [signal.soundsLikeName, signal.by, signal.whoName, signal.went],
      [
        "Noah",
        "kobold",
        null,
        {
          to: "story",
          story: "st7",
          persona: "noah",
          title: "Choosing a size",
          scene: 1,
        },
      ],
    );
    const story = await factory.read<StoryPage>("/api/understand/story?id=st7");
    assert.deepEqual(story.story.scenes[0]?.evidence, ["s19"]);
    assert.deepEqual(story.known, { seen: 3, of: 3 });
    const overview = await factory.read<UnderstandOverview>("/api/understand");
    assert.equal(overview.kobold.toLookAt[0]?.id, "s19");

    // A person says it looks good: their name is on it now.
    await factory.send("/api/understand/looks-good", { signal: "s19" });
    const looked = await factory.read<SignalView>(
      "/api/understand/signal?id=s19",
    );
    assert.notEqual(looked.by, "kobold");
  } finally {
    factory.close();
  }
});

test("a signal that fits no story starts a new one, and a real problem is suggested behind two of a persona's problems", async () => {
  const newStory = {
    title: "A card in her own words",
    starts: "The evening before sending",
    wants: "A card she wrote herself",
    scenes: [
      { text: "Writes the card", where: "Gift", shows: false, breaks: false },
      { text: "Finds no way to add it", shows: true, breaks: true },
    ],
    instead: "Posts the card herself",
    problem: { title: "No card with the gift", reading: "Gifts are personal." },
  };
  const pretend = pretendClaude([
    {
      calls: [
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: "ines",
            why: "Sends a gift to her mother.",
            place: { to: "newStory", story: newStory },
          },
        ],
      ],
      reply: "A new story.",
    },
    {
      // The new problem's id, known once the kobold wrote it.
      calls: () => [
        [
          "suggest_real_problem",
          {
            title: "A gift has to feel like it is from her",
            description: "The note and the card both say it is from her.",
            problems: ["note", newProblem()],
          },
        ],
      ],
      reply: "Suggested.",
    },
  ]);
  const factory = await koboldFactory(pretend.claude);
  const newProblem = () => {
    const store = RecordStore.open(join(factory.root, RECORDS_FILE), true);
    try {
      return (
        store.list("problems").find((p) => p.title === "No card with the gift")
          ?.id ?? ""
      );
    } finally {
      store.close();
    }
  };
  try {
    await factory.send("/api/signals", {
      source: "fb",
      id: "s19",
      text: "I wanted to add my own card to the gift.",
    });
    const jobs = await factory.settled();
    assert.deepEqual(
      jobs.map((j) => [j.kind, j.about, j.problem]),
      [
        ["suggest", "ines", null],
        ["sort", "s19", null],
      ],
    );
    assert.match(pretend.seen[1]?.prompt ?? "", /No card with the gift/);
    const { stories, problems, realProblems } = await factory.records();
    const story = stories.find((s) => s.title === newStory.title);
    assert.deepEqual(
      [story?.isNew, story?.persona, story?.from, story?.instead],
      [
        true,
        "ines",
        { signals: ["s19"] },
        { text: "Posts the card herself", evidence: [] },
      ],
    );
    assert.deepEqual(
      story?.scenes.map((s) => [s.where, s.evidence]),
      [
        ["Gift", []],
        [null, ["s19"]],
      ],
    );
    const real = realProblems.find((r) => r.persona === "ines");
    assert.equal(real?.by, "kobold");
    assert.deepEqual(
      problems.filter((p) => p.realProblem === real.id).length,
      2,
    );

    // A person confirms it, once.
    assert.equal(
      (await factory.send("/api/understand/confirm", { realProblem: real.id }))
        .status,
      200,
    );
    const again = await factory.send("/api/understand/confirm", {
      realProblem: real.id,
    });
    assert.match(again.body.error, /confirmed it already\.$/);

    // Looks good: the new story is not new any more.
    await factory.send("/api/understand/looks-good", { signal: "s19" });
    const after = (await factory.records()).stories.find(
      (s) => s.id === story.id,
    );
    assert.equal(after?.isNew, false);
  } finally {
    factory.close();
  }
});

test("a person moves a signal: into another story, to Build, or to a new story the kobold writes", async () => {
  const pretend = pretendClaude([
    { calls: [], reply: "Not sure where this goes." },
    {
      calls: [
        [
          "sort_signal",
          {
            sortedAs: "need",
            soundsLike: "mia",
            why: "Shops on her phone after work.",
            place: {
              to: "newStory",
              story: {
                title: "Coming back to pay",
                starts: "At night",
                wants: "To pay what she picked",
                scenes: [{ text: "Pays", shows: true, breaks: true }],
                problem: { id: "find" },
              },
            },
          },
        ],
      ],
      reply: "Done.",
    },
  ]);
  const factory = await koboldFactory(pretend.claude);
  try {
    await factory.send("/api/signals", {
      source: "fb",
      id: "s19",
      text: "My basket was empty when I came back.",
    });
    const [unsorted] = await factory.settled();
    assert.equal(
      unsorted?.problem,
      "The kobold did not sort it. Not sure where this goes.",
    );
    const lookAt = await factory.read<UnderstandOverview>("/api/understand");
    assert.equal(lookAt.kobold.toLookAt[0]?.went, null);
    const notYet = await factory.send("/api/understand/looks-good", {
      signal: "s19",
    });
    assert.equal(
      notYet.body.error,
      "It is not sorted yet: move it where it belongs.",
    );

    const moved = await factory.send("/api/understand/move", {
      signal: "s19",
      to: { to: "scene", story: "st1", scene: 3 },
    });
    assert.equal(
      moved.body.done,
      "It is evidence in scene 3 of “Filling the basket on the way home”.",
    );
    const page = await factory.read<PersonaPage>(
      "/api/understand/persona?id=mia",
    );
    assert.equal(page.said[0]?.id, "s19");
    assert.match(page.said[0].why, /^Moved here by /);

    const bug = await factory.send("/api/understand/move", {
      signal: "s19",
      to: { to: "build" },
    });
    assert.equal(bug.body.done, "It goes to Build.");
    let { signals, stories } = await factory.records();
    assert.deepEqual(
      [
        signals.find((s) => s.id === "s19")?.sortedAs,
        stories.find((s) => s.id === "st1")?.scenes[2]?.evidence,
      ],
      ["bug", ["s2"]],
    );

    const asked = await factory.send("/api/understand/move", {
      signal: "s19",
      to: { to: "newStory", persona: "mia" },
    });
    assert.equal(asked.body.job.kind, "sort");
    await factory.settled();
    assert.match(
      pretend.seen[1]?.prompt ?? "",
      /The person who moved it says: it starts a new story of the persona mia/,
    );
    ({ signals, stories } = await factory.records());
    const written = stories.find((s) => s.title === "Coming back to pay");
    assert.equal(written?.problem, "find");

    // Moved away again: the story the kobold wrote from it alone goes.
    await factory.send("/api/understand/move", {
      signal: "s19",
      to: { to: "answered" },
    });
    ({ signals, stories } = await factory.records());
    assert.equal(
      stories.some((s) => s.id === written.id),
      false,
    );
    assert.equal(signals.find((s) => s.id === "s19")?.sortedAs, "question");

    for (const [body, error] of [
      [{ signal: "s19", to: { to: "nowhere" } }, /^This move does not fit: /],
      [
        { signal: "s99", to: { to: "newStory" } },
        /^There is no signal “s99”\.$/,
      ],
      [{ signal: "s99", to: { to: "build" } }, /^There is no signal “s99”\.$/],
      [
        { signal: "s19", to: { to: "scene", story: "st3", scene: 1 } },
        /turned out wrong\.$/,
      ],
    ] as const)
      assert.match(
        (await factory.send("/api/understand/move", body)).body.error,
        error,
      );
  } finally {
    factory.close();
  }
});

test("the kobold drafts a question about a story's guessed scenes", async () => {
  const pretend = pretendClaude([
    { calls: [], reply: "Hi! When did you last send a gift?" },
  ]);
  const factory = await koboldFactory(pretend.claude);
  try {
    const drafted = await factory.send("/api/understand/ask", { story: "st9" });
    assert.deepEqual(drafted.body, {
      question: "Hi! When did you last send a gift?",
    });
    assert.match(pretend.seen[0]?.prompt ?? "", /two people like Ines/);
    assert.match(pretend.seen[0]?.prompt ?? "", /- Picks a scarf/);
    assert.equal(pretend.seen[0]?.mcp, undefined);

    // Without Claude Code it says so; a story fully seen needs no question.
    const failed = await factory.send("/api/understand/ask", {
      story: "st9",
    });
    assert.match(failed.body.error, /^Claude Code is not on this computer/);
    const [job] = await factory.settled();
    assert.equal(job?.kind, "ask");
    assert.match(job.problem ?? "", /^Claude Code is not on this computer/);
    for (const [story, error] of [
      ["st4", "Every scene of it is seen already."],
      ["st99", "There is no story “st99”."],
    ])
      assert.equal(
        (
          await factory.send("/api/understand/ask", {
            story,
          })
        ).body.error,
        error,
      );
  } finally {
    factory.close();
  }
});

test("a sort that fails says why, and the kobold's tools answer only its job at work", async () => {
  const factory = await koboldFactory(pretendClaude([]).claude);
  try {
    await factory.send("/api/signals", { source: "sup", text: "Hello?" });
    const [job] = await factory.settled();
    assert.match(job?.problem ?? "", /^Claude Code is not on this computer/);
    const tools = await fetch(`${factory.base}/api/kobold/mcp`, {
      method: "POST",
      headers: { "x-kobold": "guess" },
      body: "{}",
    });
    assert.equal(tools.status, 403);
  } finally {
    factory.close();
  }
});

test("a person adds a source, named once", async () => {
  const factory = await koboldFactory(pretendClaude([]).claude);
  try {
    const made = await factory.send("/api/sources", {
      name: "Shop reviews!",
      kind: "people",
    });
    assert.equal(made.body.source.id, "shop-reviews");
    const second = await factory.send("/api/sources", {
      name: "Shop  reviews",
      kind: "people",
    });
    assert.equal(second.body.source.id, "shop-reviews-2");
    for (const [body, error] of [
      [{ name: "Shop reviews!", kind: "people" }, /already\.$/],
      [{ name: "", kind: "people" }, /^This source does not fit: /],
      [{ name: "Letters", kind: "letters" }, /^This source does not fit: /],
    ] as const)
      assert.match(
        (await factory.send("/api/sources", body)).body.error,
        error,
      );
  } finally {
    factory.close();
  }
});
