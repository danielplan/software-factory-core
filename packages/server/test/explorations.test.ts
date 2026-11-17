import assert from "node:assert/strict";
import { cpSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { KobbleStore } from "@software-factory/core";

import type { Cards } from "../src/cards/cards.ts";
import { handOff } from "../src/kobble/explorations/actions.ts";
import { applyAct } from "../src/kobble/explorations/board-acts.ts";
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

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("the list: being explored with the board in small and the kobold's line, waiting, done", async () => {
  const factory = await explorationsFactory();
  try {
    const view = await factory.read<ExplorationsView>(
      "/api/kobble/explorations",
    );
    const [x1, x2] = view.exploring;
    assert.deepEqual(
      x1?.things.map((t) => [t.id, t.agreed]),
      [
        ["problem", false],
        ["choice-1", false],
        ["diagram-1", false],
        ["prototype-a", false],
        ["prototype-b", true],
        ["note-1", false],
      ],
    );
    assert.ok(x1);
    assert.equal(x1.line, "B is agreed. You can hand it off.");
    assert.equal(
      x2?.line,
      "Does his accountant need one invoice, or is one payment enough?",
    );
    assert.deepEqual(
      view.waiting.map((row) => [row.id, row.personas.map((p) => p.name)]),
      [["X-3", ["Noah"]]],
    );
    const page = await factory.page("X-1");
    assert.equal(page.board.things[0]?.kind, "problem");
    assert.deepEqual(page.tests.B, {
      id: "T-0003",
      status: "done",
      steps: 3,
      asExpected: 3,
      persona: "mia",
    });
    assert.equal(page.talk.messages.length, 3);
    assert.equal(page.talk.pointed, null);
  } finally {
    factory.close();
  }
});

test("starting one, the kobold draws on the board with its tools and points at what it means", async () => {
  const factory = await explorationsFactory([
    {
      calls: [
        [
          "add_choice",
          {
            title: "How do guests know the order worked?",
            options: [
              { name: "A page that says so", difference: "Right after paying" },
              { name: "A text message" },
            ],
          },
        ],
        [
          "add_diagram",
          { title: "After paying", diagram: "flowchart LR\n A --> B" },
        ],
        ["add_note", { text: "Noah checks his email first" }],
        ["link", { from: "problem", to: "choice-1", label: "asks" }],
        ["point_at", { id: "choice-1" }],
        [
          "name_exploration",
          { problem: "Guests are not sure the order worked." },
        ],
      ],
      reply: "I put two ways on the board. What matters most to Noah?",
    },
    {
      calls: [
        [
          "change_thing",
          { id: "choice-1", options: [{ key: "B", name: "An SMS" }] },
        ],
        ["agree", { id: "note-1", agreed: true }],
        ["unlink", { from: "problem", to: "choice-1" }],
        ["remove_thing", { id: "diagram-1" }],
        ["look_at_board", {}],
        ["remove_thing", { id: "problem" }],
      ],
      reply: "Changed B.",
    },
  ]);
  try {
    assert.equal((await factory.press("/start", { id: "X-3" })).status, 200);
    const started = await factory.settled("X-3");
    assert.equal(started.exploration.status, "exploring");
    assert.equal(
      started.exploration.problem,
      "Guests are not sure the order worked.",
    );
    assert.deepEqual(
      started.board.things.map((t) => t.id),
      ["problem", "choice-1", "diagram-1", "note-1"],
    );
    assert.deepEqual(
      started.board.links.map((l) => l.label),
      ["asks"],
    );
    assert.deepEqual(started.talk.pointed, { thing: "choice-1", times: 1 });
    assert.match(factory.answers[0]?.[0] ?? "", /Added choice-1/);
    // A person agrees, chooses and attaches; the kobold hears all of it.
    await factory.press("/board", {
      id: "X-3",
      do: { act: "choose", id: "choice-1", option: "A" },
    });
    await factory.press("/board", {
      id: "X-3",
      do: { act: "move", id: "note-1", x: 10, y: 20 },
    });
    await factory.press("/say", {
      id: "X-3",
      text: "Call it an SMS.",
      attached: ["choice-1", "gone"],
    });
    const said = await factory.settled("X-3");
    const choice = said.board.things.find((t) => t.id === "choice-1");
    assert.ok(choice?.kind === "choice");
    assert.equal(choice.options[1]?.name, "An SMS");
    assert.equal(choice.chosen, "A");
    assert.deepEqual(said.board.links, []);
    assert.equal(
      said.board.things.find((t) => t.id === "note-1")?.agreed,
      true,
    );
    assert.deepEqual(said.board.things.find((t) => t.id === "note-1")?.place, {
      x: 10,
      y: 20,
    });
    const [, second] = factory.seen;
    assert.ok(second);
    assert.match(
      second.prompt,
      /They attached, from the board: choice choice-1\./,
    );
    assert.match(
      second.prompt,
      /Since you last spoke, they chose A on choice choice-1/,
    );
    assert.equal(second.session?.resume, true);
    assert.match(
      factory.answers[1]?.[5] ?? "",
      /The problem stays on the board/,
    );
    const kept = readFileSync(
      join(factory.store.root, "explorations", "X-3", "conversation.md"),
      "utf8",
    );
    assert.match(kept, /^<!-- conversation: [\w-]+ -->/);
    // Started already: no second first look.
    await factory.press("/start", { id: "X-3" });
    assert.equal(factory.seen.length, 2);
    const refused = await fetch(
      `${factory.base}/api/kobble/explorations/mcp/X-3`,
      { method: "POST", body: "{}" },
    );
    assert.equal(refused.status, 403);
  } finally {
    factory.close();
  }
});

test("people agree, choose, add pictures and remove their own", async () => {
  const factory = await explorationsFactory();
  try {
    const agree = (id: string, agreed: boolean) =>
      factory.press("/board", { id: "X-1", do: { act: "agree", id, agreed } });
    await agree("prototype-a", true);
    const agreedNow = (await factory.page("X-1")).board.things
      .filter((t) => t.kind === "prototype")
      .map((t) => [t.id, t.agreed]);
    assert.deepEqual(agreedNow, [
      ["prototype-a", true],
      ["prototype-b", false],
    ]);
    assert.equal(
      (await factory.press("/board", { id: "X-1", do: { act: "fly" } })).body
        .error,
      "That is not something the board does.",
    );
    assert.equal(
      (
        await factory.press("/board", {
          id: "X-1",
          do: { act: "remove", id: "note-1" },
        })
      ).body.error,
      "Only what a person put on the board can be removed here.",
    );
    const added = await factory.press("/picture", {
      id: "X-1",
      title: "Basket screen",
      data: PIXEL,
    });
    const picture = added.body.thing as { id: string; image: string };
    assert.equal(picture.id, "picture-1");
    const served = await fetch(
      `${factory.base}/api/kobble/explorations/picture?id=X-1&name=${picture.image}`,
    );
    assert.equal(served.headers.get("content-type"), "image/png");
    assert.equal(
      (
        await fetch(
          `${factory.base}/api/kobble/explorations/picture?id=X-1&name=nope.png`,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await factory.press("/picture", {
          id: "X-1",
          data: "data:text/plain;base64,aGk=",
        })
      ).body.error,
      "Only pictures can go on the board.",
    );
    await factory.press("/board", {
      id: "X-1",
      do: { act: "change", id: "picture-1", title: "Basket" },
    });
    await factory.press("/board", {
      id: "X-1",
      do: { act: "remove", id: "picture-1" },
    });
    assert.ok(
      !factory.store.board("X-1").things.some((t) => t.id === "picture-1"),
    );
    const made = await factory.press("", {
      title: "Gift notes",
      problem: "People want a note.",
      persona: "mia",
    });
    assert.equal((made.body.exploration as { id: string }).id, "X-4");
    assert.equal(
      (await factory.press("", { title: " " })).body.error,
      "Say what to explore.",
    );
    assert.equal(
      (await factory.press("", { title: "x", persona: "zoe" })).body.error,
      "There is no persona “zoe”.",
    );
    await factory.press("/drop", { id: "X-2" });
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
    await agree("prototype-a", false);
    assert.equal(
      (await factory.press("/hand-off", { id: "X-1" })).body.error,
      "Agree to a prototype first: it is what is handed off.",
    );
    await agree("prototype-b", true);
    assert.match(
      String((await factory.press("/hand-off", { id: "X-1" })).body.error),
      /connect a GitHub board/,
    );
    assert.equal(
      (
        await factory.press("/make", {
          id: "X-1",
          choice: "choice-1",
          key: "B",
        })
      ).body.error,
      "Option B has a prototype already.",
    );
    assert.equal(
      (
        await factory.press("/make", {
          id: "X-1",
          choice: "choice-1",
          key: "Z",
        })
      ).body.error,
      "choice-1 has no option Z.",
    );
    assert.equal(
      (await factory.press("/make", { id: "X-1", choice: "note-1", key: "A" }))
        .body.error,
      "There is no choice “note-1” on the board.",
    );
    assert.equal(
      (await fetch(`${factory.base}/api/kobble/exploration?id=X-9`)).status,
      409,
    );
  } finally {
    factory.close();
  }
});

test("Make builds the option on its branch; Open and Test need the project's start command", async () => {
  const factory = await explorationsFactory([{ calls: [], reply: "Made it." }]);
  try {
    inGit(factory.project);
    await factory.press("/make", { id: "X-1", choice: "choice-1", key: "C" });
    const made = factory.store
      .board("X-1")
      .things.find((t) => t.id === "prototype-c");
    assert.ok(made?.kind === "prototype");
    assert.equal(made.branch, "proto/X-1-c");
    assert.ok(
      factory.store
        .board("X-1")
        .links.some(
          (l) =>
            l.from === "choice-1" && l.to === "prototype-c" && l.label === "C",
        ),
    );
    let run = (await factory.page("X-1")).runs.find((r) => r.version === "C");
    while (run?.state === "making") {
      await new Promise((resolve) => setTimeout(resolve, 20));
      run = (await factory.page("X-1")).runs.find((r) => r.version === "C");
    }
    assert.equal(run?.state, "stopped");
    const [making] = factory.seen;
    assert.ok(making);
    assert.equal(making.readOnly, false);
    assert.match(
      making.prompt,
      /The question it answers: How does the basket wait/,
    );
    assert.ok(
      existsSync(join(factory.project, "..", "project-prototypes", "X-1", "c")),
    );
    const opened = await factory.press("/open", { id: "X-1", key: "C" });
    assert.match(String(opened.body.error), /cannot run versions yet/);
    const tested = await factory.press("/test", {
      id: "X-1",
      key: "C",
      task: "Remind me tonight",
    });
    const id = (tested.body.test as { id: string }).id;
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
    assert.match(
      issue.body,
      /\*\*The question:\*\* How does the basket wait until they pay\?/,
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

test("the board's acts: options by letter, arrows between two things, what stays", () => {
  const fresh = { agreed: false, place: null, by: "kobold" as const };
  const board = {
    things: [
      {
        ...fresh,
        id: "choice-1",
        kind: "choice" as const,
        title: "Which?",
        options: [{ key: "A", name: "One", difference: "x" }],
        chosen: null,
      },
      {
        ...fresh,
        id: "prototype-a",
        kind: "prototype" as const,
        key: "A",
        name: "One",
        difference: "x",
        branch: "proto/X-1-a",
        tests: [],
      },
    ],
    links: [],
  };
  const changed = applyAct(
    board,
    {
      act: "change",
      id: "choice-1",
      options: [{ key: "a", name: "Uno" }, { name: "Two" }],
    },
    "kobold",
  ).board;
  const choice = changed.things[0];
  assert.ok(choice?.kind === "choice");
  assert.deepEqual(
    choice.options.map((o) => [o.key, o.name, o.difference]),
    [
      ["A", "Uno", "x"],
      ["B", "Two", ""],
    ],
  );
  assert.throws(
    () =>
      applyAct(
        board,
        { act: "change", id: "choice-1", removeOptions: ["A"] },
        "kobold",
      ),
    /prototype stays/,
  );
  assert.throws(
    () => applyAct(board, { act: "remove", id: "prototype-a" }, "kobold"),
    /stays on the board/,
  );
  assert.throws(
    () =>
      applyAct(
        board,
        { act: "link", from: "choice-1", to: "choice-1" },
        "kobold",
      ),
    /two different things/,
  );
  assert.throws(
    () =>
      applyAct(
        board,
        { act: "unlink", from: "choice-1", to: "prototype-a" },
        "kobold",
      ),
    /no arrow/,
  );
  assert.throws(
    () =>
      applyAct(
        board,
        { act: "choose", id: "prototype-a", option: "A" },
        "person",
      ),
    /not a choice/,
  );
  assert.throws(
    () =>
      applyAct(board, { act: "choose", id: "choice-1", option: "Q" }, "person"),
    /no option Q/,
  );
  assert.throws(
    () => applyAct(board, { act: "agree", id: "gone", agreed: true }, "person"),
    /no thing “gone”/,
  );
});
