import assert from "node:assert/strict";
import { test } from "node:test";

import { explorationsView } from "../src/extensions/explorations/views.ts";
import type { VersionRun } from "../src/prototypes/mode.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// The list of explorations tells which version Tinker is making where, so
// the sidebar's "Your kobolds" can show Tinker on every page.

test("the list says which version Tinker makes in an exploration, for the sidebar's Your kobolds", async () => {
  const factory = await explorationsFactory();
  try {
    const run = (over: Partial<VersionRun>): VersionRun => ({
      idea: "X-1",
      version: "A",
      state: "stopped",
      making: false,
      url: null,
      activity: null,
      doing: null,
      since: null,
      steps: [],
      problem: null,
      startProblem: null,
      start: null,
      ...over,
    });
    const quiet = {
      messages: [],
      writing: null,
      activity: null,
      doing: null,
      step: 0 as const,
      problem: null,
      pointed: null,
    };
    const view = explorationsView(
      factory.store,
      () => quiet,
      (id) =>
        id === "X-1"
          ? [
              run({ version: "A" }),
              run({
                version: "B",
                making: true,
                activity: "Putting the basket back",
                doing: "search",
                since: "2026-11-23T10:00:00Z",
              }),
            ]
          : [],
    );
    const [x1, x2] = view.exploring;
    assert.deepEqual(x1?.making, {
      version: "B",
      doing: "search",
      since: "2026-11-23T10:00:00Z",
    });
    assert.equal(x2?.making, null);
  } finally {
    factory.close();
  }
});
