import assert from "node:assert/strict";
import { test } from "node:test";

import { applyAct } from "../src/kobble/explorations/board-acts.ts";
import type { Claude, RunOptions } from "@software-factory/core";

import { askerFor, MakerDesk } from "../src/kobble/explorations/maker-desk.ts";
import { lookedWords } from "../src/kobble/explorations/maker-tools.ts";
import { lookAndFix, notWhileMade } from "../src/kobble/explorations/looks.ts";
import {
  cutOffIn,
  cutRun,
  markedIn,
  opensIn,
  shownAddress,
} from "../src/kobble/explorations/versions.ts";
import { choicePrototype } from "../src/kobble/explorations/versions.ts";
import { explorationsFactory } from "./explorations-factory.ts";
import { inGit } from "./git-project.ts";

// A new exploration opened at once, and a prototype with variants, switched
// outside the app, opened on the page the change is on.

test("New exploration opens a fresh one at once, waits for the idea, and opens the untouched one again", async () => {
  const factory = await explorationsFactory();
  try {
    const first = (await factory.press("/fresh")).body.exploration as {
      id: string;
      status: string;
      problem: string;
      title: string;
    };
    assert.equal(first.status, "exploring");
    assert.equal(first.problem, "");
    assert.equal(first.title, "New idea");
    await factory.press("/start", { id: first.id });
    assert.equal(factory.seen.length, 0);
    const again = (await factory.press("/fresh")).body.exploration as {
      id: string;
    };
    assert.equal(again.id, first.id);
  } finally {
    factory.close();
  }
});

test("a choice's options are the variants of one prototype, switched outside the app; another way adds one", async () => {
  const factory = await explorationsFactory([
    {
      calls: [
        [
          "add_choice",
          {
            title: "Where does the button sit?",
            options: [{ name: "Top" }, { name: "Bottom" }],
          },
        ],
        ["make_prototype", { choice: "choice-2" }],
      ],
      reply: "Making it.",
    },
    {
      // The maker looks at its prototype with its own tool.
      calls: [["look_at_prototype", { variant: "B" }]],
      reply: "Moved the button.\n\n**Opens at:** `#build`",
    },
    {
      calls: [
        [
          "another_way",
          { prototype: "A2", name: "Floating", difference: "It floats" },
        ],
      ],
      reply: "Adding another.",
    },
    { calls: [], reply: "Added D." },
  ]);
  try {
    inGit(factory.project);
    await factory.press("/say", { id: "X-1", text: "Where should it go?" });
    const made = () => {
      const thing = factory.store
        .board("X-1")
        .things.find((t) => t.kind === "prototype" && t.key === "A2");
      assert.ok(thing?.kind === "prototype");
      return thing;
    };
    while (factory.seen.length < 4 || made().variants?.length !== 3)
      await new Promise((resolve) => setTimeout(resolve, 20));
    const prototype = made();
    assert.deepEqual(
      prototype.variants?.map((one) => one.key),
      ["A", "B", "D"],
    );
    assert.equal(prototype.variant, "A");
    assert.equal(prototype.opens, "#build");
    assert.match(factory.seen[1]?.prompt ?? "", /\?variant=A/);
    assert.equal(factory.seen[1]?.mcp?.name, "prototype");
    assert.match(
      factory.answers[1]?.[0] ?? "",
      /could not be looked at: .*cannot run here yet/,
    );
    assert.match(
      factory.seen[2]?.prompt ?? "",
      /could not be looked at running: .*cannot run here yet/,
    );
    assert.match(factory.seen[3]?.prompt ?? "", /Add variant D \(“Floating”\)/);
    await factory.press("/board", {
      id: "X-1",
      do: { act: "show", id: "prototype-a2", variant: "B" },
    });
    assert.equal(made().variant, "B");
    assert.match(
      (
        await factory.press("/board", {
          id: "X-1",
          do: { act: "show", id: "prototype-a2", variant: "Z" },
        })
      ).body.error as string,
      /no variant Z/,
    );
  } finally {
    factory.close();
  }
});

test("the page a prototype opens on and the variant shown make its address", () => {
  assert.equal(opensIn("Done.\n\nOpens at: /fuel/planner"), "/fuel/planner");
  assert.equal(opensIn("Opens at: somewhere"), undefined);
  assert.equal(opensIn("no line"), undefined);
  const made = {
    opens: "#build",
    variant: "B",
    variants: [
      { key: "A", name: "a", difference: "" },
      { key: "B", name: "b", difference: "" },
    ],
  } as never;
  assert.equal(
    shownAddress("http://127.0.0.1:5301/", made),
    "http://127.0.0.1:5301/?variant=B#build",
  );
  assert.equal(
    shownAddress("http://127.0.0.1:5301/x", null),
    "http://127.0.0.1:5301/x",
  );
});

test("a choice marks the option the kobold recommends, and only one it has", () => {
  const empty = { things: [], links: [] };
  const made = applyAct(
    empty,
    {
      act: "choice",
      title: "Where?",
      options: [{ name: "Top" }, { name: "Bottom" }],
      recommended: "b",
    },
    "kobold",
  ).board;
  const choice = made.things[0];
  assert.ok(choice?.kind === "choice");
  assert.equal(choice.recommended, "B");
  assert.throws(
    () =>
      applyAct(
        made,
        { act: "change", id: "choice-1", recommended: "Z" },
        "kobold",
      ),
    /no option Z to recommend/,
  );
  const changed = applyAct(
    made,
    { act: "change", id: "choice-1", removeOptions: ["B"] },
    "kobold",
  ).board.things[0];
  assert.ok(changed?.kind === "choice");
  assert.equal(changed.recommended, undefined);
  const again = applyAct(
    made,
    { act: "change", id: "choice-1", recommended: "A" },
    "kobold",
  ).board.things[0];
  assert.ok(again?.kind === "choice");
  assert.equal(again.recommended, "A");
});

test("a prototype the factory closed on while it was being made says so", () => {
  const made = {
    id: "prototype-a",
    kind: "prototype" as const,
    agreed: false,
    place: null,
    by: "kobold" as const,
    key: "A",
    name: "One",
    difference: "",
    branch: "proto/X-1-a",
    tests: [],
  };
  const board = { things: [made], links: [] };
  const marked = markedIn(board, "A", { making: true });
  assert.ok(marked);
  assert.deepEqual([...cutOffIn(marked, () => false)], ["A"]);
  assert.deepEqual([...cutOffIn(marked, () => true)], []);
  const done = markedIn(marked, "A", { opens: "#build" });
  assert.ok(done);
  assert.deepEqual([...cutOffIn(done, () => false)], []);
  assert.equal(markedIn(board, "Z", {}), null);
  const run = cutRun({
    idea: "X-1",
    version: "A",
    state: "running",
    url: "https://x.test",
    problem: null,
  } as never);
  assert.equal(run.state, "failed");
  assert.match(run.problem ?? "", /stopped while being made/);
});

test("the maker is shown pictures of what it made and fixes it, before it is called ready", async () => {
  const pages: string[] = [];
  const asked: string[] = [];
  const done = await lookAndFix(
    { ok: true, text: "Made it.\n\nOpens at: #signals" },
    {
      ask: (prompt) => {
        asked.push(prompt);
        return Promise.resolve({
          ok: true,
          text: "Fixed.\n\nOpens at: #build",
        });
      },
      look: () =>
        Promise.resolve({ pictures: ["/looks/A-A.png"], problem: null }),
      opens: (page) => {
        pages.push(page);
      },
    },
  );
  assert.equal(done.text, "Fixed.\n\nOpens at: #build");
  assert.deepEqual(pages, ["#signals", "#build"]);
  assert.match(asked[0] ?? "", /\/looks\/A-A\.png/);
  const blind = await lookAndFix(
    { ok: true, text: "Made it." },
    {
      ask: () => Promise.reject(new Error("not asked")),
      look: () => Promise.resolve({ pictures: [], problem: "no browser" }),
      opens: () => undefined,
    },
  );
  assert.equal(blind.text, "Made it.");
  const failed = { ok: false, text: "", error: "stopped" };
  assert.equal(
    await lookAndFix(failed, {
      ask: () => Promise.reject(new Error("not asked")),
      look: () => Promise.reject(new Error("not looked")),
      opens: () => undefined,
    }),
    failed,
  );
  assert.throws(() => {
    notWhileMade({ version: "A", making: true } as never);
  }, /still being made/);
});

test("changes asked while the maker works wait, and come as one request once it is done", () => {
  const desk = new MakerDesk();
  assert.equal(desk.waiting("X-1", "A"), null);
  desk.wait("X-1", "A", "Bigger tabs");
  assert.equal(desk.waiting("X-1", "A"), "Bigger tabs");
  assert.equal(desk.waiting("X-1", "A"), null);
  desk.wait("X-1", "A", "Bigger tabs");
  desk.wait("X-1", "A", " Bold when chosen ");
  assert.equal(desk.waiting("X-1", "A"), "1. Bigger tabs\n2. Bold when chosen");
  assert.equal(desk.mcpFor("X-1", "A"), undefined);
  assert.throws(
    () => desk.tools("X-1", "B", () => Promise.reject(new Error())),
    /Nobody makes/,
  );
});

test("a prototype's makers go on in one conversation, and a change asked mid-run is told to the maker at work", () => {
  const desk = new MakerDesk();
  const told: string[] = [];
  const claude: Claude = {
    run: () => Promise.resolve({ ok: true, text: "" }),
    tell: (session, message) => {
      told.push(`${session}|${message}`);
      return true;
    },
  };
  const first = desk.sessionFor("X-1", "A");
  assert.equal(first.resume, false);
  assert.equal(desk.tell(claude, "X-1", "A", "Bigger tabs"), true);
  assert.match(told[0] ?? "", new RegExp(`^${first.id}\\|.*Bigger tabs$`));
  assert.equal(desk.tell(claude, "X-1", "B", "Bigger tabs"), false);
  assert.equal(
    desk.tell(
      { run: () => Promise.resolve({ ok: true, text: "" }) },
      "X-1",
      "A",
      "Bigger tabs",
    ),
    false,
  );
  desk.done("X-1", "A");
  assert.equal(desk.tell(claude, "X-1", "A", "Bold"), false);
  assert.deepEqual(desk.sessionFor("X-1", "A"), { id: first.id, resume: true });
  desk.use("X-1", "A", "fresh");
  desk.done("X-1", "A");
  assert.deepEqual(desk.sessionFor("X-1", "A"), { id: "fresh", resume: true });
});

test("the maker continues its conversation with a browser beside its own tool, and starts anew when it cannot", async () => {
  const runs: RunOptions[] = [];
  const fresh: string[] = [];
  const claude: Claude = {
    run: (options) => {
      runs.push(options);
      return Promise.resolve(
        options.session?.resume
          ? { ok: false, text: "", error: "No conversation found" }
          : { ok: true, text: "Made it." },
      );
    },
  };
  const ask = askerFor({
    claude,
    folder: "/copy",
    model: "sonnet",
    session: { id: "old", resume: true },
    mcp: { name: "prototype", url: "https://x/mcp", headers: {} },
    browser: { name: "browser", url: "https://b/mcp", headers: {} },
    onStep: () => undefined,
    onFresh: (session) => fresh.push(session),
  });
  const answer = await ask("Make it", false);
  assert.equal(answer.text, "Made it.");
  const [tried, again] = runs;
  assert.ok(tried && again);
  assert.equal(tried.session?.id, "old");
  assert.equal(tried.model, "sonnet");
  assert.equal(tried.alsoMcp?.[0]?.name, "browser");
  assert.notEqual(again.session?.id, "old");
  assert.equal(again.session?.resume, false);
  assert.deepEqual(fresh, [again.session.id]);
});

test("what the maker is told it looked at: the pictures, and where to use it in its browser", () => {
  const words = lookedWords({
    pictures: ["/looks/A-A.png"],
    problem: null,
    addresses: ["http://localhost:5200/?variant=A"],
  });
  assert.match(words, /\/looks\/A-A\.png/);
  assert.match(words, /runs at http:\/\/localhost:5200\/\?variant=A/);
  assert.match(words, /click, type/);
  assert.doesNotMatch(
    lookedWords({ pictures: ["/a.png"], problem: null }),
    /runs at/,
  );
});

test("a new question in an exploration with a prototype becomes its variants, in the same copy, on the variant shown so far", () => {
  const two = (title: string) => ({
    act: "choice" as const,
    title,
    options: [{ name: "One way" }, { name: "Another way" }],
  });
  let board = applyAct(
    { things: [], links: [] },
    two("Where?"),
    "kobold",
  ).board;
  const first = choicePrototype(board, "X-9", "choice-1", []);
  board = first.board;
  const made = board.things.find((t) => t.kind === "prototype");
  assert.ok(made?.kind === "prototype");
  board = {
    ...board,
    things: board.things.map((t) =>
      t.id === made.id ? { ...t, variant: "B" } : t,
    ),
  };
  board = applyAct(board, two("What does it say?"), "kobold").board;
  const second = choicePrototype(board, "X-9", "choice-2", []);
  assert.equal(second.key, first.key);
  const prototypes = second.board.things.filter((t) => t.kind === "prototype");
  assert.equal(prototypes.length, 1);
  const now = prototypes[0];
  assert.ok(now?.kind === "prototype");
  assert.deepEqual(
    now.variants?.map((one) => one.key),
    ["A", "B"],
  );
  assert.equal(now.variant, "A");
  assert.equal(now.name, "What does it say?");
  assert.match(second.change ?? "", /new question: “What does it say\?”/);
  assert.match(
    second.change ?? "",
    /variant B \(“Another way”\) shows as the prototype's base/,
  );
  assert.ok(
    second.board.links.some((l) => l.from === "choice-2" && l.to === made.id),
  );
});
