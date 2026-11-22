import assert from "node:assert/strict";
import { test } from "node:test";

import type { ReleasesView } from "../src/api/client.ts";
import { ENGLISH } from "../src/i18n/messages.ts";
import { placeOf } from "../src/lib/routes.ts";
import {
  problemWith,
  shownOf,
  whyOf,
} from "../src/extensions/releases/view.ts";

type Ready = Extract<ReleasesView, { connected: true }>;

const ready = (over: Partial<Ready["coming"]>, last: string | null): Ready => ({
  connected: true,
  repository: "acme/shop",
  last,
  coming: {
    merged: [
      {
        number: 7,
        title: "Crash on empty cart",
        url: "https://github.com/acme/shop/pull/7",
        type: "bug",
      },
    ],
    next: "1.4.3",
    why: "Only fixes and improvements since 1.4.2",
    ...over,
  },
  past: [],
});

test("the page is in the menu's address list and has its words", () => {
  assert.deepEqual(placeOf("#releases"), { page: "releases", open: null });
  assert.equal(ENGLISH("shell.pages.releases"), "Releases");
  assert.equal(
    ENGLISH("releases.releaseNow", { number: "1.4.3" }),
    "Release 1.4.3",
  );
});

test("the page is loading, in a problem, without a repository, or ready", () => {
  assert.deepEqual(shownOf({ data: null, problem: null }), {
    state: "loading",
  });
  assert.deepEqual(shownOf({ data: null, problem: "No network" }), {
    state: "problem",
    text: "No network",
  });
  assert.deepEqual(
    shownOf({ data: { connected: false, problem: "x" }, problem: null }),
    { state: "no-repository" },
  );
  const view = ready({}, "1.4.2");
  assert.deepEqual(shownOf({ data: view, problem: null }), {
    state: "ready",
    view,
  });
});

test("the line beside the number is the kobold's reason, or why there is none", () => {
  assert.deepEqual(whyOf(ready({}, "1.4.2")), {
    kind: "said",
    text: "Only fixes and improvements since 1.4.2",
  });
  assert.deepEqual(whyOf(ready({ why: null }, "1.4.2")), { kind: "unknown" });
  assert.deepEqual(whyOf(ready({ why: null }, null)), { kind: "first" });
  assert.deepEqual(whyOf(ready({ merged: [], why: null }, "1.4.2")), {
    kind: "nothing",
  });
});

test("a number typed is checked before Release now is allowed", () => {
  assert.equal(problemWith("1.5.0", "1.4.3"), null);
  assert.equal(problemWith(" 1.4.4 ", "1.4.3"), null);
  assert.equal(problemWith("0.0.1", null), null);
  assert.equal(problemWith("1.5", "1.4.3"), "not-a-number");
  assert.equal(problemWith("", "1.4.3"), "not-a-number");
  assert.equal(problemWith("1.4.3", "1.4.3"), "not-higher");
  assert.equal(problemWith("1.3.9", "1.4.3"), "not-higher");
  assert.equal(problemWith("2.0.0", "1.9.9"), null);
});
