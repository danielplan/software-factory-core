import assert from "node:assert/strict";
import { test } from "node:test";

import {
  movedHash,
  PAGES,
  placeOf,
  understandHash,
  understandOf,
} from "../src/lib/routes.ts";

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

test("without a page, or with one that does not exist, the board's work comes first", () => {
  assert.deepEqual(placeOf(""), { page: "build", open: null });
  assert.deepEqual(placeOf("#"), { page: "build", open: null });
  assert.deepEqual(placeOf("#nowhere/1"), { page: "build", open: null });
  assert.deepEqual(placeOf("#constructor"), { page: "build", open: null });
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
