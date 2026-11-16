import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  IdeaPage,
  PartView,
  VersionCard,
  VersionRun,
} from "../src/api.ts";
import {
  madeWords,
  mainOf,
  pickWords,
  ideaWhy,
  runOf,
  runWords,
  sendLine,
  versionsWords,
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

test("an idea says how many versions are shared, and why it is at its stage", () => {
  assert.equal(versionsWords(0), "no versions yet");
  assert.equal(versionsWords(1), "1 version");
  assert.equal(versionsWords(3), "3 versions");
  const why = (
    stage: IdeaPage["stage"],
    {
      answer = null,
      ...more
    }: Partial<Line> & Pick<Partial<IdeaPage>, "answer"> = {},
  ) => ideaWhy({ ...page(more), answer, stage });
  assert.equal(why("idea"), "No versions yet: make them in prototype mode.");
  assert.equal(why("versions"), "Nobody has picked a version yet.");
  assert.equal(
    why("versions", { tie: true }),
    "Two or more versions share the most picks.",
  );
  assert.equal(
    why("picked", { lead: { key: "B", name: "Basket" } }),
    "B has the most picks",
  );
  const tickets = [{ issue: 144, version: "B2" }];
  assert.equal(why("building", { tickets }), "In Build as #144");
  assert.equal(
    why("building", { tickets: [...tickets, { issue: 131, version: "B" }] }),
    "In Build as #144 and #131",
  );
  assert.equal(why("inApp", { tickets }), "In the app as #144: did it work?");
  const answer = { issue: 144, worked: "yes", by: "Pia", on: "16 Nov" };
  assert.equal(
    why("worked", { tickets, answer }),
    "Closed by Pia on 16 Nov: it worked",
  );
  assert.equal(why("didntWork"), "It didn't work");
  assert.equal(pickWords([]), "");
  assert.equal(pickWords(["Pia"]), "1 pick");
  assert.equal(pickWords(["Pia", "Luca"]), "2 picks");
});

test("the one action sends the version with the most picks, or asks to pick one", () => {
  assert.deepEqual(
    sendLine(page({ lead: { key: "B", name: "Basket keeps it" } })),
    {
      words: "Most picks: B, basket keeps it.",
      button: "Send B to Build",
      version: "B",
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
    words: "A and B have the same picks: pick one.",
    button: "Pick one to send",
    version: null,
  });
  assert.equal(
    sendLine(page({ versions: [version("A", [])] })).words,
    "Nobody picked one yet: try them, then pick.",
  );
  assert.deepEqual(
    sendLine(page({ state: "inBuild", tickets: [{ issue: 9, version: "B" }] })),
    {
      words: "Version B went to Build as issue #9.",
      button: null,
      version: null,
    },
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
  assert.equal(versionTitle(null), "Main");
  assert.equal(
    versionTitle({ key: "B", name: "Basket" }),
    "Version B · Basket",
  );
  assert.equal(madeWords(["kobold", "Luca"]), "made by the kobold and Luca");
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
    { url: "http://localhost:3000", words: "Shop as it runs now" },
  );
  assert.match(mainOf([part({})]).words, /not running: start it on Workshop/);
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
    /names no prototype command/,
  );
  assert.equal(
    stillWords({ canRun: true }, run({ state: "making", activity: "Editing" })),
    "The kobold is making it: Editing",
  );
  assert.equal(
    stillWords({ canRun: true }, run({ state: "making" })),
    "The kobold is making it.",
  );
  assert.equal(
    stillWords({ canRun: true }, run({ state: "starting" })),
    "Starting it…",
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
