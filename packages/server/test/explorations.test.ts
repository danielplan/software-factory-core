import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import type { Cards } from "../src/cards/cards.ts";
import { handOff } from "../src/kobble/explorations/actions.ts";
import { changeBoard } from "../src/kobble/explorations/board-edit.ts";
import type {
  ExplorationPage,
  ExplorationsView,
} from "../src/kobble/explorations/views.ts";
import { inGit } from "./git-project.ts";
import { pretendClaude } from "./pretend-claude.ts";
import { stage } from "./stage.ts";

// Explorations: the list, one exploration's canvas and the conversation
// with the kobold (which changes the board with its tool), and the buttons
// on it: Start, New, Drop, Agree, Make, Open, Test, Hand off.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");

type Turn = Parameters<typeof pretendClaude>[0][number];

async function explorationsFactory(turns: Turn[] = []) {
  const pretend = pretendClaude(turns);
  const staged = await stage(pretend.claude);
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  const store = new KobbleStore(root);
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const press = async (path: string, body: unknown = {}) => {
    const response = await staged.post(`/api/kobble/explorations${path}`, body);
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  };
  const page = (id: string) =>
    read<ExplorationPage>(`/api/kobble/exploration?id=${id}`);
  // The page once the kobold is not writing any more.
  const settled = async (id: string) => {
    for (;;) {
      const now = await page(id);
      if (now.talk.writing === null) return now;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return {
    ...staged,
    ...pretend,
    root,
    store,
    read,
    press,
    page,
    settled,
    close,
  };
}

test("the list: being explored with the kobold's line, waiting, and what is done", async () => {
  const factory = await explorationsFactory();
  try {
    const view = await factory.read<ExplorationsView>(
      "/api/kobble/explorations",
    );
    assert.deepEqual(
      view.exploring.map((row) => [
        row.id,
        row.options,
        row.prototypes,
        row.line,
      ]),
      [
        [
          "X-1",
          ["A", "B", "C"],
          [
            { key: "A", agreed: false },
            { key: "B", agreed: true },
          ],
          "B is agreed. You can hand it off.",
        ],
        [
          "X-2",
          ["A", "B"],
          [],
          "Does his accountant need one invoice, or is one payment enough?",
        ],
      ],
    );
    assert.deepEqual(
      view.waiting.map((row) => [row.id, row.personas.map((p) => p.name)]),
      [["X-3", ["Noah"]]],
    );
    assert.deepEqual(view.done, []);
    const x1 = await factory.page("X-1");
    assert.equal(x1.board.question, "How does the basket wait until they pay?");
    assert.deepEqual(x1.tests.B, {
      id: "T-0003",
      status: "done",
      steps: 3,
      asExpected: 3,
      persona: "mia",
    });
    assert.equal(x1.tests.A, null);
    assert.equal(x1.talk.messages.length, 3);
    assert.equal(x1.talk.messages[1]?.from, "you");
  } finally {
    factory.close();
  }
});

test("starting one, the kobold puts a question and options on the board", async () => {
  const factory = await explorationsFactory([
    {
      calls: [
        [
          "board",
          {
            question: "How do guests know the order worked?",
            options: [
              { name: "A page that says so", difference: "Right after paying" },
              { name: "A text message" },
            ],
            notes: ["Noah checks his email first"],
          },
        ],
      ],
      reply: "I put two ways on the board. What matters most to Noah?",
    },
    {
      calls: [
        [
          "board",
          { options: [{ key: "B", name: "An SMS" }], removeNotes: [1] },
        ],
      ],
      reply: "Changed B.",
    },
  ]);
  try {
    assert.equal((await factory.press("/start", { id: "X-3" })).status, 200);
    const started = await factory.settled("X-3");
    assert.equal(started.exploration.status, "exploring");
    assert.deepEqual(started.board.options, [
      {
        key: "A",
        name: "A page that says so",
        difference: "Right after paying",
      },
      { key: "B", name: "A text message", difference: "" },
    ]);
    assert.deepEqual(started.board.notes, ["Noah checks his email first"]);
    assert.match(
      factory.answers[0]?.[0] ?? "",
      /How do guests know the order worked/,
    );
    assert.match(
      factory.seen[0]?.prompt ?? "",
      /The problem: First-time buyers/,
    );
    // Said again: it goes on with the same conversation.
    await factory.press("/say", { id: "X-3", text: "Call it an SMS." });
    const said = await factory.settled("X-3");
    assert.equal(said.board.options[1]?.name, "An SMS");
    assert.deepEqual(said.board.notes, []);
    assert.deepEqual(
      said.talk.messages.map((m) => m.from),
      ["kobold", "you", "kobold"],
    );
    assert.equal(factory.seen[1]?.session?.resume, true);
    const kept = readFileSync(
      join(factory.store.root, "explorations", "X-3", "conversation.md"),
      "utf8",
    );
    assert.match(kept, /^<!-- conversation: [\w-]+ -->/);
    assert.match(kept, /\*\*You:\*\* Call it an SMS\./);
    // Started already: no second first look.
    assert.equal((await factory.press("/start", { id: "X-3" })).status, 200);
    assert.equal(factory.seen.length, 2);
    // Only the conversation's own Claude Code may change the board.
    const refused = await fetch(
      `${factory.base}/api/kobble/explorations/mcp/X-3`,
      {
        method: "POST",
        body: "{}",
      },
    );
    assert.equal(refused.status, 403);
  } finally {
    factory.close();
  }
});

test("agree, new, drop, and what is refused", async () => {
  const factory = await explorationsFactory();
  try {
    await factory.press("/agree", { id: "X-1", key: "A" });
    let board = factory.store.board("X-1");
    assert.deepEqual(
      board.prototypes.map((p) => [p.key, p.agreed]),
      [
        ["A", true],
        ["B", false],
      ],
    );
    await factory.press("/agree", { id: "X-1", key: "A" });
    board = factory.store.board("X-1");
    assert.ok(board.prototypes.every((p) => !p.agreed));
    assert.equal(
      (await factory.press("/agree", { id: "X-1", key: "C" })).body.error,
      "X-1 has no prototype C.",
    );
    const made = await factory.press("", {
      title: "Gift notes",
      problem: "People want to add a personal note.",
      persona: "mia",
    });
    assert.equal(
      (made.body.exploration as { id: string; status: string }).id,
      "X-4",
    );
    assert.equal(
      (await factory.press("", { title: " " })).body.error,
      "Say what to explore.",
    );
    assert.equal(
      (await factory.press("", { title: "x", persona: "zoe" })).body.error,
      "There is no persona “zoe”.",
    );
    await factory.press("/drop", { id: "X-2" });
    assert.equal(factory.store.get("explorations", "X-2")?.status, "dropped");
    assert.equal(
      (await factory.press("/drop", { id: "X-2" })).body.error,
      "X-2 is dropped already.",
    );
    const view = await factory.read<ExplorationsView>(
      "/api/kobble/explorations",
    );
    assert.deepEqual(
      view.done.map((row) => row.id),
      ["X-2"],
    );
    // Handing off needs an agreed prototype, and a connected board.
    assert.equal(
      (await factory.press("/hand-off", { id: "X-1" })).body.error,
      "Agree to a prototype first: it is what is handed off.",
    );
    await factory.press("/agree", { id: "X-1", key: "B" });
    assert.match(
      String((await factory.press("/hand-off", { id: "X-1" })).body.error),
      /connect a GitHub board/,
    );
    assert.equal(
      (await factory.press("/make", { id: "X-1", key: "B" })).body.error,
      "Option B has a prototype already.",
    );
    assert.equal(
      (await factory.press("/make", { id: "X-1", key: "Z" })).body.error,
      "X-1 has no option Z.",
    );
    const none = await fetch(`${factory.base}/api/kobble/exploration?id=X-9`);
    assert.equal(none.status, 409);
  } finally {
    factory.close();
  }
});

test("Make builds the option on its branch; Open and Test need the project's start command", async () => {
  const factory = await explorationsFactory([{ calls: [], reply: "Made it." }]);
  try {
    inGit(factory.project);
    await factory.press("/make", { id: "X-1", key: "C" });
    const made = factory.store
      .board("X-1")
      .prototypes.find((p) => p.key === "C");
    assert.equal(made?.branch, "proto/X-1-c");
    let run = (await factory.page("X-1")).runs.find((r) => r.version === "C");
    while (run?.state === "making") {
      await new Promise((resolve) => setTimeout(resolve, 20));
      run = (await factory.page("X-1")).runs.find((r) => r.version === "C");
    }
    assert.equal(run?.state, "stopped");
    const [making] = factory.seen;
    assert.ok(making);
    assert.equal(making.readOnly, false);
    assert.match(making.prompt, /Make prototype C of the exploration/);
    assert.ok(
      existsSync(join(factory.project, "..", "project-prototypes", "X-1", "c")),
    );
    const opened = await factory.press("/open", { id: "X-1", key: "C" });
    assert.match(String(opened.body.error), /cannot run versions yet/);
    // Test: a persona test on the prototype's branch, as Mia.
    const tested = await factory.press("/test", {
      id: "X-1",
      key: "C",
      task: "Remind me tonight",
    });
    const id = (tested.body.test as { id: string }).id;
    assert.deepEqual(
      factory.store.board("X-1").prototypes.find((p) => p.key === "C")?.tests,
      [id],
    );
    let page = await factory.page("X-1");
    while (page.tests.C?.status !== "failed") page = await factory.page("X-1");
    const kept = factory.store.get("tests", id);
    assert.ok(kept);
    assert.equal(kept.on, "proto/X-1-c");
    assert.match(kept.problem ?? "", /cannot run versions yet/);
    assert.equal(
      (await factory.press("/test", { id: "X-3", key: "A", task: "x" })).body
        .error,
      "X-3 has no prototype A.",
    );
  } finally {
    factory.close();
  }
});

test("hand off writes handoff.md and the issue, with what was learned", async () => {
  const factory = await explorationsFactory();
  try {
    const made: { title: string; body: string }[] = [];
    const cards = {
      create: (title: string, body: string) => {
        made.push({ title, body });
        return Promise.resolve({ number: 51, url: "https://example.com/51" });
      },
    } as unknown as Cards;
    const answer = await handOff(factory.store, "X-1", () => cards);
    assert.deepEqual(answer, { issue: 51, url: "https://example.com/51" });
    const [issue] = made;
    assert.ok(issue);
    assert.equal(
      issue.title,
      "The basket is empty when people come back to pay",
    );
    assert.match(issue.body, /on the branch `proto\/X-1-b`/);
    assert.match(issue.body, /Persona test T-0003: 3 of 3 steps as expected/);
    assert.match(issue.body, /Mia often pays on the laptop/);
    const x1 = factory.store.get("explorations", "X-1");
    assert.ok(x1);
    assert.equal(x1.status, "handed-off");
    assert.equal(x1.work, 51);
    assert.match(
      readFileSync(
        join(factory.store.root, "explorations", "X-1", "handoff.md"),
        "utf8",
      ),
      /Handed off as #51\./,
    );
  } finally {
    factory.close();
  }
});

test("the board's options: a new one gets the next letter, one with a prototype stays", () => {
  const board = {
    question: "",
    options: [{ key: "A", name: "One", difference: "x" }],
    prototypes: [
      {
        key: "A",
        name: "One",
        difference: "x",
        branch: "proto/X-1-a",
        agreed: false,
        tests: [],
      },
    ],
    notes: [],
  };
  assert.deepEqual(
    changeBoard(board, {
      options: [{ key: "a", name: "Uno" }, { name: "Two" }],
    }).options,
    [
      { key: "A", name: "Uno", difference: "x" },
      { key: "B", name: "Two", difference: "" },
    ],
  );
  assert.throws(
    () => changeBoard(board, { removeOptions: ["A"] }),
    /has a prototype/,
  );
});
