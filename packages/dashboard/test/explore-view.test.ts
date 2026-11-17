import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  IdeaPage,
  IdeaRow,
  PartView,
  VersionCard,
  VersionRun,
} from "../src/api.ts";
import {
  canSend,
  ideaGroups,
  ideaNext,
  listOf,
  madeWords,
  mainOf,
  voteWords,
  ideaWhy,
  runOf,
  runWords,
  sendLine,
  stillWords,
  versionTitle,
} from "../src/explore/view.ts";

// What Explore and prototype mode say, from what the server sends.

const version = (key: string, picks: string[]): VersionCard => ({
  idea: "wish",
  key,
  name: `Version ${key}`,
  branch: `factory/wish/${key.toLowerCase()}`,
  madeBy: ["kobold"],
  surface: "phone",
  sharedAt: "2026-11-16",
  picks,
  thumbnail: null,
  mine: false,
});

type Line = Pick<IdeaPage, "lead" | "tie" | "versions" | "state" | "tickets">;
const page = (more: Partial<Line>): Line => ({
  lead: null,
  tie: false,
  versions: [],
  state: "exploring",
  tickets: [],
  ...more,
});

test("an idea says why it is at its stage", () => {
  const why = (
    stage: IdeaPage["stage"],
    {
      answer = null,
      ...more
    }: Partial<Line> & Pick<Partial<IdeaPage>, "answer"> = {},
  ) => ideaWhy({ ...page(more), answer, stage });
  assert.equal(why("idea"), "No versions yet — make some in prototype mode.");
  assert.equal(why("versions"), "Nobody has voted yet.");
  assert.equal(
    why("versions", { tie: true }),
    "Two or more versions are tied.",
  );
  assert.equal(
    why("picked", { lead: { key: "B", name: "Basket" } }),
    "B has the most votes.",
  );
  const tickets = [{ issue: 144, version: "B2" }];
  assert.equal(why("building", { tickets }), "Being built as #144.");
  assert.equal(
    why("building", { tickets: [...tickets, { issue: 131, version: "B" }] }),
    "Being built as #144 and #131.",
  );
  assert.equal(why("inApp", { tickets }), "In the app as #144 — did it work?");
  const answer = { issue: 144, worked: "yes", by: "Pia", on: "16 Nov" };
  assert.equal(
    why("worked", { tickets, answer }),
    "Pia closed it on 16 Nov: it worked.",
  );
  assert.equal(why("didntWork"), "It didn't work.");
  assert.equal(voteWords([]), "0 votes");
  assert.equal(voteWords(["Pia"]), "1 vote");
  assert.equal(voteWords(["Pia", "Luca"]), "2 votes");
});

test("the send row sends the version with the most votes, or says why it cannot yet", () => {
  assert.deepEqual(
    sendLine(page({ lead: { key: "B", name: "Basket keeps it" } })),
    {
      words: "B has the most votes.",
      button: "Send B to Build",
      version: "B",
      connect: false,
    },
  );
  const tied = sendLine(
    page({
      tie: true,
      versions: [
        version("A", ["Pia"]),
        version("B", ["Luca"]),
        version("C", []),
      ],
    }),
  );
  assert.deepEqual(tied, {
    words: "A and B are tied — vote to decide.",
    button: "Send to Build",
    version: null,
    connect: false,
  });
  assert.equal(
    sendLine(page({ versions: [version("A", [])] })).words,
    "Nobody has voted yet — try the versions and vote.",
  );
  assert.deepEqual(
    sendLine(page({ state: "inBuild", tickets: [{ issue: 9, version: "B" }] })),
    {
      words: "Version B went to Build as #9.",
      button: null,
      version: null,
      connect: false,
    },
  );
  // Without a GitHub board, it says so up front instead of failing.
  assert.deepEqual(sendLine(page({ lead: { key: "B", name: "B" } }), false), {
    words:
      "B has the most votes. To send it to Build, connect a GitHub board first.",
    button: null,
    version: null,
    connect: true,
  });
  assert.equal(canSend("github", { github: {} } as never), true);
  assert.equal(canSend("github", {}), false);
  assert.equal(canSend("none", {}), false);
  assert.equal(canSend("jira", { jira: {} } as never), false);
});

test("the ideas are grouped by step: plan, prototypes, handed off, dropped", () => {
  const row = (id: string, stage: IdeaRow["stage"]): IdeaRow => ({
    id,
    title: id,
    persona: null,
    state: "exploring",
    stage,
    versions: 0,
  });
  const groups = ideaGroups([
    row("a", "idea"),
    row("b", "building"),
    row("c", "versions"),
    row("d", "picked"),
    row("e", "inApp"),
    row("f", "worked"),
    row("g", "didntWork"),
  ]);
  assert.deepEqual(
    groups.map((group) => [group.step, group.ideas.map((i) => i.id)]),
    [
      ["plan", ["a"]],
      ["prototypes", ["c", "d"]],
      ["handedOff", ["b", "e", "f"]],
      ["dropped", ["g"]],
    ],
  );
});

test("a version says what it is doing, and who made it", () => {
  const runs: VersionRun[] = [
    {
      idea: "wish",
      version: "B",
      state: "running",
      url: "http://localhost:5301",
      activity: null,
      problem: null,
    },
  ];
  assert.equal(runWords(runOf(runs, "wish", "B")), "Running");
  assert.equal(runWords(runOf(runs, "wish", "A")), "Stopped");
  assert.equal(runWords({ state: "making" }), "The kobold is making it");
  assert.equal(listOf(["A", "B", "C"]), "A, B, and C");
  assert.equal(versionTitle(null), "Main");
  assert.equal(
    versionTitle({ key: "B", name: "Basket" }),
    "Version B · Basket",
  );
  assert.equal(madeWords(["kobold", "Luca"]), "Made by the kobold and Luca");
});

test("Main is the product as it runs now, or says why it is not shown", () => {
  const part = (more: Partial<PartView>): PartView => ({
    id: "shop",
    name: "Shop",
    area: "products",
    does: "",
    dependsOn: [],
    start: "auto",
    light: "stopped",
    step: null,
    problem: null,
    link: null,
    canStart: true,
    canStop: false,
    outside: false,
    ...more,
  });
  assert.deepEqual(
    mainOf([part({ light: "running", link: "http://localhost:3000" })]),
    { url: "http://localhost:3000", words: "Shop, as it runs now" },
  );
  assert.match(mainOf([part({})]).words, /Start it on the Product page/);
  assert.match(mainOf([]).words, /no product to run here/);
});

test("a version with nothing to show says why", () => {
  const run = (more: Partial<VersionRun>): VersionRun => ({
    idea: "wish",
    version: "A",
    state: "stopped",
    url: null,
    activity: null,
    problem: null,
    ...more,
  });
  assert.match(
    stillWords({ canRun: false }, run({})),
    /can't run versions yet/,
  );
  assert.equal(
    stillWords({ canRun: true }, run({ state: "making", activity: "Editing" })),
    "The kobold is making it: Editing",
  );
  assert.equal(
    stillWords({ canRun: true }, run({ state: "making" })),
    "The kobold is making it…",
  );
  assert.equal(
    stillWords({ canRun: true }, run({ state: "starting" })),
    "Starting…",
  );
  assert.equal(
    stillWords(
      { canRun: true },
      run({ state: "failed", problem: "It stopped: x" }),
    ),
    "It stopped: x",
  );
  assert.match(stillWords({ canRun: true }, run({})), /Start it to try it/);
});

test("each idea's card says what is next, only when its stage doesn't", () => {
  const next = (stage: IdeaRow["stage"], versions = 0) =>
    ideaNext({ stage, versions });
  assert.equal(next("idea"), null);
  assert.equal(next("versions", 1), "1 version to try");
  assert.equal(next("versions", 3), "3 versions to try");
  assert.equal(next("picked"), "Ready to send to Build");
  assert.equal(next("building"), null);
  assert.equal(next("inApp"), "In the app — did it work?");
  assert.equal(next("worked"), null);
  assert.equal(next("didntWork"), null);
});
