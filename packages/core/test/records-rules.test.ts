import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { checkRecords, readSeed, type Records } from "../src/index.ts";
import { ACME } from "./stand-ins.ts";

// The rules every product's records keep (records/check.ts), each broken
// on purpose in a copy of the example company's seed, which keeps them all.

const SEED = readSeed(join(ACME, "kobble-seed.json"));

// What the checks say once the change is made to a copy of the seed.
function broken(change: (records: Records) => void): string[] {
  const records = structuredClone(SEED);
  change(records);
  return checkRecords(records);
}

function one<T extends { id: string }>(list: T[], id: string): T {
  const found = list.find((record) => record.id === id);
  assert.ok(found, id);
  return found;
}

const signal = (r: Records, id: string) => one(r.signals, id);
const story = (r: Records, id: string) => one(r.stories, id);
const problem = (r: Records, id: string) => one(r.problems, id);

test("the example company's seed keeps every rule", () => {
  assert.deepEqual(checkRecords(SEED), []);
  assert.equal(SEED.personas.length, 4);
  assert.deepEqual(
    SEED.stories.map((s) => s.id),
    ["st1", "st2", "st3", "st4", "st5", "st6", "st10", "st7", "st8", "st9"],
  );
});

test("a signal has its source, its customer and its persona; only machine errors are counted", () => {
  assert.deepEqual(
    broken((r) => {
      signal(r, "s1").source = "letters";
      signal(r, "s2").who = "nobody";
      signal(r, "s17").soundsLike = "ghost";
    }),
    [
      "Signal s1: its source “letters” is not there.",
      "Signal s2: its customer “nobody” is not there.",
      "Signal s17: its persona “ghost” is not there.",
    ],
  );
  assert.deepEqual(
    broken((r) => {
      signal(r, "s2").n = 4;
    }),
    [
      "Signal s2: only machine errors are counted: a signal from people stays single.",
    ],
  );
  // The error on Safari is counted: 23 times.
  assert.equal(signal(SEED, "s15").n, 23);
});

test("where a signal went is there", () => {
  assert.deepEqual(
    broken((r) => {
      signal(r, "s15").wentTo = { to: "ticket", issue: 999 };
      signal(r, "s1").wentTo = { to: "problem", id: "lost" };
      signal(r, "s2").wentTo = { to: "story", id: "st99" };
    }),
    [
      "Signal s1: the problem “lost” it went to is not there.",
      "Signal s2: the story “st99” it went to is not there.",
      "Signal s15: the ticket #999 it went to is not there.",
    ],
  );
});

test("a signal that feeds a problem or a story sounds like that persona", () => {
  assert.deepEqual(
    broken((r) => {
      signal(r, "s3").soundsLike = "noah";
      signal(r, "s2").wentTo = { to: "story", id: "st7" };
    }),
    [
      "Signal s2: it went to the story st7, but it sounds like mia, not like noah.",
      "Signal s3: it went to the problem find, but it sounds like noah, not like mia.",
      "Story st1: the signal s3 it comes from cannot count: it sounds like noah, not like mia.",
      "Story st1: the signal s3 in scene 1 cannot count: it sounds like noah, not like mia.",
      "Story st1: the signal s3 in scene 2 cannot count: it sounds like noah, not like mia.",
    ],
  );
  // One not sorted yet feeds nothing.
  assert.deepEqual(
    broken((r) => {
      signal(r, "s17").wentTo = null;
    }),
    [],
  );
});

test("persona runs are never evidence about real people", () => {
  const problems = broken((r) => {
    r.sources.push({ id: "runs", name: "Persona runs", kind: "personaRuns" });
    r.signals.push({
      ...signal(r, "s14"),
      id: "run1",
      source: "runs",
    });
    story(r, "st9").scenes[0]!.evidence = ["run1"];
  });
  const why =
    "it comes from a persona run, which is never evidence about real people.";
  assert.deepEqual(problems, [
    `Signal run1: it went to the problem note, but ${why}`,
    `Story st9: the signal run1 in scene 1 cannot count: ${why}`,
  ]);
  // A problem with only a persona run behind it has no signals behind it.
  assert.ok(
    broken((r) => {
      r.sources.push({ id: "runs", name: "Persona runs", kind: "personaRuns" });
      signal(r, "s14").source = "runs";
    }).includes(
      "Problem note: no signals are behind it: a problem comes from what people said, or is marked assumed when it comes from an idea.",
    ),
  );
});

test("a story breaks exactly once, at a problem of the same persona, unless it is marked wrong", () => {
  assert.deepEqual(
    broken((r) => {
      story(r, "st1").scenes[0]!.breaks = true;
      story(r, "st2").scenes[1]!.breaks = false;
      story(r, "st4").problem = "size";
    }),
    [
      "Problem copy: no story breaks at it.",
      "Story st1: it breaks 2 times: a story breaks exactly once, unless it is marked wrong.",
      "Story st2: it breaks 0 times: a story breaks exactly once, unless it is marked wrong.",
      "Story st4: its problem size is noah's, not bruno's.",
    ],
  );
  assert.deepEqual(
    broken((r) => {
      story(r, "st9").problem = null;
      story(r, "st3").problem = "slotsP";
    }),
    [
      "Problem note: no story breaks at it.",
      "Story st3: it is marked wrong, so it breaks at no problem.",
      "Story st9: it breaks at no problem: it needs one, unless it is marked wrong.",
    ],
  );
  assert.deepEqual(
    broken((r) => {
      story(r, "st9").problem = "gone";
      story(r, "st9").persona = "nobody";
    }),
    [
      "Problem note: no story breaks at it.",
      "Story st9: its persona “nobody” is not there.",
      "Story st9: the signal s14 it comes from cannot count: it sounds like ines, not like nobody.",
      "Story st9: the signal s14 in scene 2 cannot count: it sounds like ines, not like nobody.",
      "Story st9: its problem “gone” is not there.",
    ],
  );
  // A wrong story breaks at nothing: the pickup story, tried and wrong.
  assert.equal(story(SEED, "st3").wrong !== null, true);
});

test("a story's evidence and its origin are there", () => {
  assert.deepEqual(
    broken((r) => {
      story(r, "st1").from = { signals: ["s404"] };
      story(r, "st10").from = { idea: "nothing" };
      story(r, "st2").instead = { text: "Waits", evidence: ["s405"] };
    }),
    [
      "Story st1: the signal “s404” it comes from is not there.",
      "Story st2: the signal “s405” in instead is not there.",
      "Story st10: its idea “nothing” is not there.",
    ],
  );
});

test("a problem has signals behind it, or it is assumed and comes from an idea's story", () => {
  const nothingSaid = broken((r) => {
    for (const id of ["s4", "s5"]) signal(r, id).wentTo = { to: "answered" };
  });
  assert.deepEqual(nothingSaid, [
    "Problem invoice: no signals are behind it: a problem comes from what people said, or is marked assumed when it comes from an idea.",
  ]);
  // Signals that went to one of its stories are behind it too.
  assert.deepEqual(
    broken((r) => {
      for (const id of ["s4", "s5"])
        signal(r, id).wentTo = { to: "story", id: "st6" };
    }),
    [],
  );
  assert.deepEqual(
    broken((r) => {
      problem(r, "note").assumed = true;
    }),
    [
      "Problem note: it is marked assumed, but signals are behind it: once people say it, it is no longer assumed.",
      "Problem note: it is assumed, so it comes from an idea's story, and none breaks at it.",
    ],
  );
  assert.deepEqual(
    broken((r) => {
      problem(r, "note").persona = "ghost";
      problem(r, "note").realProblem = "r_none";
    }),
    [
      "Signal s14: it went to the problem note, but it sounds like ines, not like ghost.",
      "Problem note: its persona “ghost” is not there.",
      "Problem note: its real problem “r_none” is not there.",
      "Story st9: its problem note is ghost's, not ines's.",
    ],
  );
});

test("a real problem sits behind at least two problems of the same persona", () => {
  assert.deepEqual(
    broken((r) => {
      problem(r, "size").realProblem = null;
      problem(r, "find").realProblem = "r_bruno";
    }),
    [
      "Real problem r_mia: it sits behind 1 problem(s): a real problem sits behind at least two problems of one persona.",
      "Real problem r_bruno: the problem find under it is mia's, not bruno's.",
      "Real problem r_noah: it sits behind 1 problem(s): a real problem sits behind at least two problems of one persona.",
    ],
  );
  assert.deepEqual(
    broken((r) => {
      one(r.realProblems, "r_mia").persona = "nobody";
    }),
    [
      "Real problem r_mia: its persona “nobody” is not there.",
      "Real problem r_mia: the problem find under it is mia's, not nobody's.",
      "Real problem r_mia: the problem slotsP under it is mia's, not nobody's.",
    ],
  );
});

test("customers, ideas and versions point to what is there", () => {
  assert.deepEqual(
    broken((r) => {
      one(r.customers, "lisa").persona = "nobody";
      one(r.ideas, "wish").origin = { from: "problem", id: "lost" };
      one(r.ideas, "remind").problems = ["lost"];
      one(r.ideas, "pickup").persona = null;
      one(r.ideas, "standing").persona = "nobody";
      r.versions[0]!.idea = "gone";
    }),
    [
      "Customer lisa: its persona “nobody” is not there.",
      "Idea wish: its problem “lost” is not there.",
      "Idea remind: its problem “lost” is not there.",
      "Idea standing: its persona “nobody” is not there.",
      "Idea pickup: it is for no problem, so it names the persona it is for.",
      "Version gone/A: its idea “gone” is not there.",
    ],
  );
});

test("a ticket comes from a version of an idea, or from a signal", () => {
  const ticket = (r: Records, issue: number) => {
    const found = r.ticketLinks.find((t) => t.issue === issue);
    assert.ok(found);
    return found;
  };
  assert.deepEqual(
    broken((r) => {
      ticket(r, 145).kind = "idea";
      ticket(r, 143).from = { signal: "s404" };
      ticket(r, 138).kind = "fix";
      ticket(r, 135).from = { idea: "size", version: "Z" };
      ticket(r, 131).problems = ["find", "lost"];
    }),
    [
      "Ticket 145: an idea's ticket comes from a version of the idea, not a signal.",
      "Ticket 143: its signal “s404” is not there.",
      "Ticket 138: a fix comes from a signal, not from an idea's version.",
      "Ticket 135: its version Z of the idea “size” is not there.",
      "Ticket 131: its problem “lost” is not there.",
      "Ticket 131: it is for the problem find, which its idea does not address.",
      "Ticket 131: it is for the problem lost, which its idea does not address.",
    ],
  );
  assert.deepEqual(
    broken((r) => {
      r.outcomes[0]!.issue = 404;
    }),
    ["Outcome 404: there is no ticket #404 for it to answer."],
  );
});

test("a record is there only once", () => {
  assert.deepEqual(
    broken((r) => {
      r.personas.push({ ...one(r.personas, "mia") });
      r.versions.push({ ...r.versions[0]! });
    }),
    ["Persona mia is there twice.", "Version wish/A is there twice."],
  );
});
