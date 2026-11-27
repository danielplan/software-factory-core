import assert from "node:assert/strict";
import { test } from "node:test";

import {
  movedHash,
  PAGES,
  pathOf,
  personaPath,
  placeOf,
  placeShown,
  testingPath,
} from "../src/lib/routes.ts";

test("a persona has its own address", () => {
  assert.deepEqual(placeOf("#personas/mia"), { page: "personas", open: "mia" });
  assert.equal(personaPath(), "/personas");
  assert.equal(personaPath("gift buyer"), "/personas/gift%20buyer");
});

test("Testing has its tests and a new test at their own addresses", () => {
  assert.deepEqual(placeOf("#testing/T-0001"), {
    page: "testing",
    open: "T-0001",
  });
  assert.equal(testingPath(), "/testing");
  assert.equal(testingPath({ test: "T-0001" }), "/testing/T-0001");
  assert.equal(testingPath({ new: null }), "/testing/new");
  assert.equal(testingPath({ new: "gift buyer" }), "/testing/new/gift%20buyer");
});

test("an address written the old way becomes the router's path", () => {
  assert.equal(pathOf("#explore/X-3"), "/explore/X-3");
  assert.equal(pathOf("#build"), "/build");
  assert.equal(pathOf("build"), "/build");
  assert.equal(pathOf("/system"), "/system");
});

test("each page has its own address, with what is open in it", () => {
  for (const page of PAGES)
    assert.deepEqual(placeOf(`#${page}`), { page, open: null });
  assert.deepEqual(placeOf("#explore/idea-1"), {
    page: "explore",
    open: "idea-1",
  });
  assert.deepEqual(placeOf("#personas/mia"), {
    page: "personas",
    open: "mia",
  });
  assert.deepEqual(placeOf("#explore/"), { page: "explore", open: null });
});

test("without a page, or with one that does not exist, Home comes first", () => {
  assert.deepEqual(placeOf(""), { page: "home", open: null });
  assert.deepEqual(placeOf("#"), { page: "home", open: null });
  assert.deepEqual(placeOf("#nowhere/1"), { page: "home", open: null });
  assert.deepEqual(placeOf("#constructor"), { page: "home", open: null });
});

test("connecting a board keeps its own address", () => {
  assert.deepEqual(placeOf("#connect"), { page: "connect", open: null });
});

test("the old addresses lead to the new pages", () => {
  assert.equal(movedHash("#board"), "#build");
  assert.equal(movedHash("#ideas"), "#explore");
  assert.equal(movedHash("#ideas/idea-1"), "#explore/idea-1");
  assert.equal(movedHash("#workshop"), "#system");
  assert.equal(movedHash("#workshop/add-ons"), "#extensions");
  assert.equal(movedHash("#add-ons"), "#extensions");
  assert.equal(movedHash("#settings/add-ons"), "#extensions");
  assert.equal(movedHash("ideas/idea-1"), "#explore/idea-1");
  assert.equal(movedHash("#today"), "#signals");
  assert.equal(movedHash("#customers"), "#personas");
  assert.equal(movedHash("#products"), "#system");
  assert.equal(movedHash("#understand/mia/st1"), "#personas/mia/st1");
  assert.equal(movedHash("#prototype/wish/b"), "#explore/");
  assert.deepEqual(placeOf("#prototype/wish"), { page: "explore", open: null });
  assert.deepEqual(placeOf("#ideas/idea-1"), {
    page: "explore",
    open: "idea-1",
  });
  assert.deepEqual(placeOf("#add-ons"), { page: "extensions", open: null });
});

test("the new addresses have not moved", () => {
  for (const page of PAGES) assert.equal(movedHash(`#${page}`), null);
  assert.equal(movedHash(""), null);
  assert.equal(movedHash("#connect"), null);
});

test("the router's path says the same place as the hash", () => {
  assert.deepEqual(placeOf("/explore/X-1"), { page: "explore", open: "X-1" });
  assert.deepEqual(placeOf("/"), { page: "home", open: null });
  assert.equal(movedHash("board/12"), "#build/12");
});

test("the page of an extension that is not installed is not there: Home is", () => {
  const pages = [{ id: "explore" }];
  const shown = (hash: string) => placeShown(placeOf(hash), pages, []);
  assert.deepEqual(shown("#explore/X-1"), { page: "explore", open: "X-1" });
  assert.deepEqual(shown("#personas/mia"), { page: "home", open: null });
  assert.deepEqual(shown("#settings/updates"), {
    page: "settings",
    open: "updates",
  });
  assert.deepEqual(shown("#team/board"), { page: "home", open: null });
});
