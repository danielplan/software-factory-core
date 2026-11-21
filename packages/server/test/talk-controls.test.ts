import assert from "node:assert/strict";
import { test } from "node:test";

import type { Claude, ClaudeResult, RunOptions } from "@software-factory/core";

import { Talk } from "../src/coach/talk.ts";

// The chat controls every kobold's conversation has: words said while it
// answers steer that answer, and Stop ends it.

const RIGHTS = { readOnly: true };

// A Claude Code whose turns end when the test says, with what it wrote so
// far; `tell` and `interrupt` only when asked for.
function heldClaude(can: { tell?: boolean; interrupt?: boolean }) {
  const prompts: string[] = [];
  const told: string[] = [];
  let ending: ((result: ClaudeResult) => void) | null = null;
  let options: RunOptions | null = null;
  const claude: Claude = {
    run(given) {
      prompts.push(given.prompt);
      options = given;
      return new Promise((resolve) => {
        ending = resolve;
      });
    },
    ...(can.tell
      ? {
          tell: (_session: string, message: string) => {
            told.push(message);
            return true;
          },
        }
      : {}),
    ...(can.interrupt
      ? {
          interrupt: () => {
            ending?.({ ok: false, text: "", error: "closed" });
            return true;
          },
        }
      : {}),
  };
  return {
    claude,
    prompts,
    told,
    write: (text: string) => options?.onText?.(text),
    end: (text: string) => ending?.({ ok: true, text }),
  };
}

function talkOn(claude: Claude) {
  return new Talk({ claude, cwd: "/project", onChange: () => {} });
}

test("words said while the kobold answers go into its answer", async () => {
  const held = heldClaude({ tell: true });
  const talk = talkOn(held.claude);
  const turn = talk.answer(talk.heard("Make it blue") ?? "", undefined, RIGHTS);
  assert.equal(talk.heard("and round", " (attached)"), null);
  assert.deepEqual(held.told, ["and round (attached)"]);
  held.end("Blue and round.");
  await turn;
  assert.deepEqual(
    talk.messages.map((m) => m.text),
    ["Make it blue", "and round", "Blue and round."],
  );
  assert.equal(held.prompts.length, 1);
});

test("words that cannot join the answer are answered right after it", async () => {
  const held = heldClaude({});
  const talk = talkOn(held.claude);
  const turn = talk.answer(talk.heard("Make it blue") ?? "", undefined, RIGHTS);
  assert.equal(talk.heard("and round"), null);
  held.end("Blue.");
  await turn;
  assert.deepEqual(held.prompts, ["Make it blue", "and round"]);
  assert.equal(talk.working, true);
  held.end("Round too.");
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(talk.working, false);
  assert.equal(talk.messages.at(-1)?.text, "Round too.");
});

test("Stop ends the answer, keeps what it wrote and shows no problem", async () => {
  const held = heldClaude({ interrupt: true });
  const talk = talkOn(held.claude);
  assert.equal(talk.stop(), false);
  const turn = talk.answer(talk.heard("Tell me all") ?? "", undefined, RIGHTS);
  held.write("First, the");
  assert.equal(talk.stop(), true);
  assert.equal(await turn, false);
  assert.equal(talk.working, false);
  assert.equal(talk.problem, null);
  assert.equal(talk.messages.at(-1)?.text, "First, the");
  void talk.answer("Go on", undefined, RIGHTS);
  assert.match(held.prompts.at(-1) ?? "", /I stopped your last answer/);
});

test("Stop is refused by a Claude Code that cannot stop a turn", () => {
  const held = heldClaude({});
  const talk = talkOn(held.claude);
  void talk.answer("Hello", undefined, RIGHTS);
  assert.equal(talk.stop(), false);
  assert.equal(talk.working, true);
});
