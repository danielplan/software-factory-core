import assert from "node:assert/strict";
import { test } from "node:test";

import {
  exploreHash,
  exploreOf,
  movedHash,
  newIdeaHash,
  PAGES,
  placeOf,
  prototypeHash,
  prototypeOf,
  personaHash,
  understandHash,
  understandOf,
} from "../src/lib/routes.ts";

test("a persona has its own address", () => {
  assert.deepEqual(placeOf("#personas/mia"), { page: "personas", open: "mia" });
  assert.equal(personaHash(), "#personas");
  assert.equal(personaHash("gift buyer"), "#personas/gift%20buyer");
  assert.equal(personaHash("mia", {}), "#personas/mia/tests");
  assert.equal(
    personaHash("mia", { test: "T-0001" }),
    "#personas/mia/tests/T-0001",
  );
});

test("each page has its own address, with what is open in it", () => {
  for (const page of PAGES)
    assert.deepEqual(placeOf(`#${page}`), { page, open: null });
  assert.deepEqual(placeOf("#explore/idea-1"), {
    page: "explore",
    open: "idea-1",
  });
  assert.deepEqual(placeOf("#workshop/add-ons"), {
    page: "workshop",
    open: "add-ons",
  });
  assert.deepEqual(placeOf("#explore/"), { page: "explore", open: null });
});

test("without a page, or with one that does not exist, the signals come first", () => {
  assert.deepEqual(placeOf(""), { page: "signals", open: null });
  assert.deepEqual(placeOf("#"), { page: "signals", open: null });
  assert.deepEqual(placeOf("#nowhere/1"), { page: "signals", open: null });
  assert.deepEqual(placeOf("#constructor"), { page: "signals", open: null });
});

test("connecting a board keeps its own address", () => {
  assert.deepEqual(placeOf("#connect"), { page: "connect", open: null });
});

test("the old addresses lead to the new pages", () => {
  assert.equal(movedHash("#board"), "#build");
  assert.equal(movedHash("#ideas"), "#explore");
  assert.equal(movedHash("#ideas/idea-1"), "#explore/idea-1");
  assert.equal(movedHash("#system"), "#workshop");
  assert.equal(movedHash("#add-ons"), "#workshop/add-ons");
  assert.equal(movedHash("ideas/idea-1"), "#explore/idea-1");
  assert.equal(movedHash("#today"), "#signals");
  assert.equal(movedHash("#customers"), "#personas");
  assert.equal(movedHash("#products"), "#workshop");
  assert.deepEqual(placeOf("#ideas/idea-1"), {
    page: "explore",
    open: "idea-1",
  });
  assert.deepEqual(placeOf("#add-ons"), { page: "workshop", open: "add-ons" });
});

test("the new addresses have not moved", () => {
  for (const page of PAGES) assert.equal(movedHash(`#${page}`), null);
  assert.equal(movedHash(""), null);
  assert.equal(movedHash("#connect"), null);
});

test("Understand opens a persona, or one of their stories", () => {
  assert.deepEqual(placeOf("#understand/mia/st1"), {
    page: "understand",
    open: "mia/st1",
  });
  assert.deepEqual(understandOf(null), { persona: null, story: null });
  assert.deepEqual(understandOf("mia"), { persona: "mia", story: null });
  assert.deepEqual(understandOf("mia/"), { persona: "mia", story: null });
  assert.deepEqual(understandOf("mia/st1"), { persona: "mia", story: "st1" });
  assert.deepEqual(understandOf("/st1"), { persona: null, story: null });
  assert.deepEqual(understandOf("b%C3%A4r/a%20b"), {
    persona: "bär",
    story: "a b",
  });
  assert.equal(understandHash(), "#understand");
  assert.equal(understandHash("mia"), "#understand/mia");
  assert.equal(understandHash("mia", "st1"), "#understand/mia/st1");
  assert.equal(understandHash(undefined, "st1"), "#understand");
  assert.equal(understandHash("bär", "a b"), "#understand/b%C3%A4r/a%20b");
});

test("Explore opens an idea, or the new idea dialog, with a story picked", () => {
  assert.deepEqual(exploreOf(null), { idea: null, newIdea: null });
  assert.deepEqual(exploreOf("wish"), { idea: "wish", newIdea: null });
  assert.deepEqual(exploreOf("new"), { idea: null, newIdea: { story: null } });
  assert.deepEqual(exploreOf("new/st%201"), {
    idea: null,
    newIdea: { story: "st 1" },
  });
  assert.equal(exploreHash(), "#explore");
  assert.equal(exploreHash("wish list"), "#explore/wish%20list");
  assert.equal(newIdeaHash(), "#explore/new");
  assert.equal(newIdeaHash("st1"), "#explore/new/st1");
});

test("prototype mode is a page of its own, on an idea and one of its versions", () => {
  assert.deepEqual(placeOf("#prototype/wish/B"), {
    page: "prototype",
    open: "wish/B",
  });
  assert.deepEqual(prototypeOf("wish/B"), { idea: "wish", version: "B" });
  assert.deepEqual(prototypeOf("wish"), { idea: "wish", version: null });
  assert.deepEqual(prototypeOf(null), { idea: null, version: null });
  assert.equal(prototypeHash("wish"), "#prototype/wish");
  assert.equal(prototypeHash("wish", "B"), "#prototype/wish/B");
});
