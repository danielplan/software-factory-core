import assert from "node:assert/strict";
import { test } from "node:test";

import { applyAct } from "../src/kobble/explorations/board-acts.ts";
import {
  cutOffIn,
  cutRun,
  markedIn,
  opensIn,
  shownAddress,
} from "../src/kobble/explorations/versions.ts";
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
    { calls: [], reply: "Moved the button.\n\n**Opens at:** `#build`" },
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
