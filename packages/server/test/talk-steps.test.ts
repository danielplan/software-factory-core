import assert from "node:assert/strict";
import { test } from "node:test";

import type { Claude, ClaudeResult, RunOptions } from "@software-factory/core";

import { Talk } from "../src/coach/talk.ts";
import { explorationsFactory } from "./explorations-factory.ts";

// The explorer's steps follow what Claude Code reports, never the clock; a
// turn that failed says why in plain words and can be tried again.

const RIGHTS = { readOnly: true };

// A Claude Code that reports what the test says, then ends when it says.
function reporting() {
  let options: RunOptions | null = null;
  let ending: ((result: ClaudeResult) => void) | null = null;
  const claude: Claude = {
    run(given) {
      options = given;
      return new Promise((resolve) => {
        ending = resolve;
      });
    },
  };
  return {
    claude,
    report: (line: string) => options?.onActivity(line),
    end: (result: ClaudeResult) => ending?.(result),
  };
}

test("a step is reached when the explorer reports it, not before, and never goes back", async () => {
  const held = reporting();
  const talk = new Talk({ claude: held.claude, cwd: "/p", onChange: () => {} });
  const turn = talk.answer("Hello", undefined, RIGHTS);
  assert.equal(talk.step, 0);
  held.report("Getting started");
  held.report("Using mcp__setup__look_at_board");
  assert.equal(talk.step, 0);
  held.report("Reading src/pay.ts");
  assert.equal(talk.step, 1);
  held.report("Searching for “card”");
  assert.equal(talk.step, 1);
  held.report("Using mcp__setup__add_choice");
  assert.equal(talk.step, 2);
  held.report("Reading src/pay.ts");
  assert.equal(talk.step, 2);
  held.end({ ok: true, text: "Done." });
  await turn;
  // The next turn starts over.
  const again = talk.answer("More", undefined, RIGHTS);
  assert.equal(talk.step, 0);
  held.end({ ok: true, text: "Ok." });
  await again;
});

test("a failed turn keeps the step it stopped at and says who stopped and why", async () => {
  const held = reporting();
  const talk = new Talk({
    claude: held.claude,
    cwd: "/p",
    who: "The explorer",
    onChange: () => {},
  });
  const turn = talk.answer("Hello", undefined, RIGHTS);
  held.report("Reading src/pay.ts");
  held.end({ ok: false, text: "", error: "" });
  await turn;
  assert.equal(talk.step, 1);
  assert.equal(talk.writing, null);
  assert.equal(
    talk.problem,
    "The explorer stopped: no reason given. Try again.",
  );
});

test("the owner's last words are taken back only when the answer failed", async () => {
  const held = reporting();
  const talk = new Talk({ claude: held.claude, cwd: "/p", onChange: () => {} });
  assert.equal(talk.takeBack(), null);
  const turn = talk.answer(talk.heard("Make it blue") ?? "", undefined, RIGHTS);
  assert.equal(talk.takeBack(), null, "not while it answers");
  held.end({ ok: false, text: "", error: "boom" });
  await turn;
  assert.equal(talk.takeBack(), "Make it blue");
  assert.deepEqual(talk.messages, []);
});

test("Try again says the last words again once, and the steps start over", async () => {
  const factory = await explorationsFactory();
  try {
    await factory.press("/say", { id: "X-1", text: "Where should it go?" });
    const failed = await factory.settled("X-1");
    assert.match(failed.talk.problem ?? "", /not on this computer/);
    const said = (page: typeof failed) =>
      page.talk.messages.filter((m) => m.text === "Where should it go?");
    assert.equal(said(failed).length, 1);
    await factory.press("/again", { id: "X-1" });
    const second = await factory.settled("X-1");
    assert.equal(factory.seen.length, 2);
    assert.match(factory.seen[1]?.prompt ?? "", /^Where should it go\?/);
    assert.equal(said(second).length, 1);
    assert.equal(second.talk.messages.at(-1)?.text, "Where should it go?");
    assert.equal(second.talk.step, 0);
  } finally {
    factory.close();
  }
});
