import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { test } from "node:test";

import { claudeArgs, describeEvent, WarmClaude } from "../src/index.ts";

// Claude Code kept open between turns, and its events as plain lines.

// A pretend Claude Code process: reads turns from stdin, answers each with a
// few words streamed, then a result. "(stop)" in a turn makes it exit.
function pretendClaude() {
  const started: { args: string[]; cwd: string; turns: string[] }[] = [];
  const start = (_executable: string, args: string[], cwd: string) => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const child = Object.assign(new EventEmitter(), {
      stdin,
      stdout,
      stderr: new PassThrough(),
      kill() {
        stdout.end();
        setImmediate(() => child.emit("close", null));
        return true;
      },
    });
    const record = { args, cwd, turns: [] as string[] };
    started.push(record);
    let buffer = "";
    stdin.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      for (let at; (at = buffer.indexOf("\n")) !== -1;) {
        const turn = JSON.parse(buffer.slice(0, at)) as {
          message: { content: string };
        };
        buffer = buffer.slice(at + 1);
        record.turns.push(turn.message.content);
        if (turn.message.content.includes("(stop)")) {
          child.kill();
          continue;
        }
        // "(wait)" is a long turn: it answers only when stopped.
        if (turn.message.content.includes("(wait)")) continue;
        const words = ["Sure,", "number", String(record.turns.length)];
        const send = (event: object) =>
          stdout.write(`${JSON.stringify(event)}\n`);
        send({ type: "stream_event", event: { type: "message_start" } });
        for (const word of words)
          send({
            type: "stream_event",
            event: { delta: { type: "text_delta", text: `${word} ` } },
          });
        send({
          type: "result",
          result: words.join(" "),
          session_id: args[args.indexOf("--session-id") + 1] || "resumed",
        });
      }
    });
    return child;
  };
  return { started, start };
}

const base = {
  cwd: "/work/setup",
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  model: "sonnet",
  onActivity: () => {},
};

test("one Claude Code process answers every turn of a conversation, streaming the words", async () => {
  const pretend = pretendClaude();
  const warm = new WarmClaude("claude", { start: pretend.start });
  const texts: string[] = [];
  const first = await warm.run({
    ...base,
    prompt: "Hello",
    session: { id: "s-1", resume: false },
    onText: (t) => texts.push(t),
  });
  assert.deepEqual(first, { ok: true, text: "Sure, number 1", session: "s-1" });
  assert.deepEqual(texts, ["Sure, ", "Sure, number ", "Sure, number 1 "]);
  const second = await warm.run({
    ...base,
    prompt: "And now?",
    session: { id: "s-1", resume: true },
  });
  assert.equal(second.text, "Sure, number 2");
  assert.equal(pretend.started.length, 1);
  const { args, cwd, turns } = pretend.started[0]!;
  assert.deepEqual(turns, ["Hello", "And now?"]);
  assert.equal(cwd, "/work/setup");
  for (const option of [
    "--input-format",
    "stream-json",
    "--include-partial-messages",
    "--model",
    "sonnet",
    "--session-id",
    "s-1",
  ])
    assert.ok(args.includes(option), `missing ${option}`);
  assert.ok(args.includes("Edit"), "read-only: Edit is not allowed");
  warm.stop();
});

test("each conversation has its own process; a stopped one starts again and continues", async () => {
  const pretend = pretendClaude();
  const warm = new WarmClaude("claude", { start: pretend.start });
  await warm.run({ ...base, prompt: "A", session: { id: "a", resume: false } });
  await warm.run({ ...base, prompt: "B", session: { id: "b", resume: false } });
  assert.equal(pretend.started.length, 2);

  const lost = await warm.run({
    ...base,
    prompt: "(stop)",
    session: { id: "a", resume: true },
  });
  assert.equal(lost.ok, false);
  const again = await warm.run({
    ...base,
    prompt: "Still there?",
    session: { id: "a", resume: true },
  });
  assert.equal(again.ok, true);
  assert.equal(pretend.started.length, 3);
  const restarted = pretend.started[2]!.args;
  assert.equal(restarted[restarted.indexOf("--resume") + 1], "a");
  warm.stop();
});

test("a turn can be stopped: Claude Code closes and the turn ends as not done", async () => {
  const pretend = pretendClaude();
  const warm = new WarmClaude("claude", { start: pretend.start });
  const stop = new AbortController();
  const long = warm.run({
    ...base,
    prompt: "(wait)",
    session: { id: "s", resume: false },
    stop: stop.signal,
  });
  stop.abort();
  assert.equal((await long).ok, false);
  const already = await warm.run({
    ...base,
    prompt: "Never sent",
    session: { id: "t", resume: false },
    stop: stop.signal,
  });
  assert.deepEqual(already, { ok: false, text: "", error: "Stopped." });
  const next = await warm.run({
    ...base,
    prompt: "Hello again",
    session: { id: "s", resume: true },
  });
  assert.equal(next.ok, true);
  warm.stop();
});

test("a conversation closes after a while without turns", async () => {
  const pretend = pretendClaude();
  const warm = new WarmClaude("claude", { start: pretend.start, idleMs: 20 });
  await warm.run({ ...base, prompt: "A", session: { id: "a", resume: false } });
  await new Promise((resolve) => setTimeout(resolve, 60));
  await warm.run({ ...base, prompt: "B", session: { id: "a", resume: true } });
  assert.equal(pretend.started.length, 2);
  warm.stop();
});

const workspace = "C:\\work\\build";

function toolUse(name: string, input: Record<string, unknown>) {
  return {
    type: "assistant",
    message: { content: [{ type: "tool_use", name, input }] },
  };
}

test("tool calls become short plain descriptions with paths relative to the working copy", () => {
  assert.deepEqual(
    describeEvent(
      toolUse("Read", {
        file_path: "C:\\work\\build\\shop\\src\\Home.tsx",
      }),
      workspace,
    ),
    ["Reading shop/src/Home.tsx"],
  );
  assert.deepEqual(
    describeEvent(
      toolUse("Edit", { file_path: "C:/work/build/orders/src/a.ts" }),
      workspace,
    ),
    ["Editing orders/src/a.ts"],
  );
  assert.deepEqual(
    describeEvent(
      toolUse("Bash", {
        command: "npm run verify",
        description: "Run all checks",
      }),
      workspace,
    ),
    ["Running: Run all checks"],
  );
  assert.deepEqual(
    describeEvent(toolUse("Grep", { pattern: "OrderCard" }), workspace),
    ["Searching for “OrderCard”"],
  );
});

test("Claude's own words are shown shortened, and the final result is reported", () => {
  const long = "a".repeat(300);
  const [line] = describeEvent(
    { type: "assistant", message: { content: [{ type: "text", text: long }] } },
    workspace,
  );
  assert.ok(line && line.length <= 161);
  assert.deepEqual(
    describeEvent(
      {
        type: "result",
        subtype: "success",
        is_error: false,
        duration_ms: 125000,
      },
      workspace,
    ),
    ["Finished in 2 min 5 s"],
  );
  assert.deepEqual(
    describeEvent({ type: "system", subtype: "init" }, workspace),
    ["Claude started"],
  );
  assert.deepEqual(describeEvent({ type: "user" }, workspace), []);
});

test("extra tools can be denied, and instructions last the whole conversation", () => {
  const args = claudeArgs({
    cwd: "/work",
    prompt: "",
    readOnly: true,
    onActivity: () => {},
    deny: ["Read(**/.env*)"],
    instructions: "Be brief.",
  });
  assert.ok(args.includes("Read(**/.env*)"));
  assert.equal(args[args.indexOf("--append-system-prompt") + 1], "Be brief.");
});

// A Claude Code that is not there: starting it fails as spawn does.
function missingClaude() {
  const stdout = new PassThrough();
  const child = Object.assign(new EventEmitter(), {
    stdin: new PassThrough(),
    stdout,
    stderr: null,
    kill: () => true,
  });
  setImmediate(() => {
    child.emit(
      "error",
      Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" }),
    );
  });
  return child;
}

test("Claude Code gone for a moment (it updates itself): the turn waits and tries again", async () => {
  const pretend = pretendClaude();
  let gone = 2;
  const waited: number[] = [];
  const activity: string[] = [];
  const warm = new WarmClaude("claude", {
    start: (executable, args, cwd) =>
      gone-- > 0 ? missingClaude() : pretend.start(executable, args, cwd),
    waits: [5, 10, 20],
    wait: async (ms) => {
      waited.push(ms);
    },
  });
  const result = await warm.run({
    ...base,
    prompt: "Hello",
    session: { id: "s-gone", resume: false },
    onActivity: (line) => activity.push(line),
  });
  assert.deepEqual(result, {
    ok: true,
    text: "Sure, number 1",
    session: "s-gone",
  });
  warm.stop();
  assert.deepEqual(waited, [5, 10]);
  assert.equal(activity.filter((line) => line.includes("waiting")).length, 2);
});

test("Claude Code still not there after every try: the turn says so; one that started is not tried again", async () => {
  const waited: number[] = [];
  const missing = new WarmClaude("claude", {
    start: () => missingClaude(),
    waits: [1, 2],
    wait: async (ms) => {
      waited.push(ms);
    },
  });
  const gone = await missing.run({
    ...base,
    prompt: "Hello",
    session: { id: "s-never", resume: false },
  });
  assert.equal(gone.ok, false);
  assert.match(gone.error ?? "", /ENOENT/);
  assert.deepEqual(waited, [1, 2]);

  const pretend = pretendClaude();
  const tried: number[] = [];
  const warm = new WarmClaude("claude", {
    start: pretend.start,
    wait: async (ms) => {
      tried.push(ms);
    },
  });
  const stopped = await warm.run({
    ...base,
    prompt: "(stop)",
    session: { id: "s-started", resume: false },
  });
  warm.stop();
  assert.equal(stopped.ok, false);
  assert.deepEqual(tried, []);
  assert.equal(pretend.started.length, 1);
});
