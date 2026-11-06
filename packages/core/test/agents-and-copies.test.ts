import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  readFileSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  addsText,
  claudeArgs,
  readEvent,
  replySoFar,
  resultOf,
  retryWhileLocked,
  run,
  Workspace,
} from "../src/index.ts";

const base = { cwd: "/copy", prompt: "", onActivity: () => {} };

test("an agent never pushes or uses gh; read-only it edits nothing, or only its one folder", () => {
  const writer = claudeArgs({ ...base, readOnly: false });
  const after = (args: string[]) =>
    args.slice(args.indexOf("--disallowedTools") + 1);
  assert.ok(after(writer).includes("Bash(git push *)"));
  assert.ok(!after(writer).includes("Edit"));
  assert.ok(after(claudeArgs({ ...base, readOnly: true })).includes("Edit"));
  const one = claudeArgs({ ...base, readOnly: true, editFolder: "/proto" });
  assert.equal(one[one.indexOf("--add-dir") + 1], "/proto");
  assert.ok(after(one).includes("Edit(./**)"));
  assert.ok(!after(one).includes("Edit"));
});

test("an agent's tools, model, board tools and conversation are passed on", () => {
  const args = claudeArgs(
    {
      ...base,
      readOnly: true,
      tools: ["Read"],
      model: "sonnet",
      session: { id: "s-1", resume: true },
      onText: () => {},
      mcp: { name: "board", url: "http://127.0.0.1:1/mcp", headers: {} },
    },
    true,
  );
  for (const expected of [
    "--input-format",
    "--include-partial-messages",
    "--strict-mcp-config",
  ])
    assert.ok(args.includes(expected), expected);
  assert.equal(args[args.indexOf("--tools") + 1], "Read");
  assert.equal(args[args.indexOf("--model") + 1], "sonnet");
  assert.equal(args[args.indexOf("--resume") + 1], "s-1");
  assert.equal(args[args.indexOf("--allowedTools") + 1], "mcp__board");
  const fresh = claudeArgs({
    ...base,
    readOnly: false,
    tools: ["Read"],
    session: { id: "s-2", resume: false },
  });
  assert.equal(fresh[fresh.indexOf("--session-id") + 1], "s-2");
  assert.ok(fresh.includes("--strict-mcp-config"));
});

test("Claude Code's lines: the reply as it is written, and the result", () => {
  assert.equal(readEvent("not json"), null);
  const start = readEvent('{"event":{"type":"message_start"}}');
  const words = readEvent(
    '{"event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}}',
  );
  assert.ok(start && words);
  assert.equal(replySoFar(start, "old"), "");
  assert.equal(replySoFar(words, "Say "), "Say Hi");
  assert.equal(addsText(words), true);
  assert.equal(addsText(start), false);
  assert.deepEqual(resultOf({ result: "Done", session_id: "s" }), {
    ok: true,
    text: "Done",
    session: "s",
  });
  assert.deepEqual(
    resultOf({ is_error: true, subtype: "error_max_turns" }, " x "),
    {
      ok: false,
      text: "",
      error: "error_max_turns x",
      session: undefined,
    },
  );
});

test("a copy is made from the base branch, never takes settings files, and links what git does not keep", async () => {
  const folder = mkdtempSync(join(tmpdir(), "copies-"));
  const git = (...args: string[]) => run("git", args);
  const origin = join(folder, "origin.git");
  const source = join(folder, "source");
  await git("init", "--quiet", "--bare", "-b", "main", origin);
  await git("clone", "--quiet", origin, source);
  mkdirSync(join(source, "app"));
  writeFileSync(join(source, "app", "README.md"), "An app");
  writeFileSync(join(source, "app", ".env.example"), "PORT=3000\n");
  await git("-C", source, "add", ".");
  await git(
    "-C",
    source,
    "-c",
    "user.name=t",
    "-c",
    "user.email=t@t",
    "commit",
    "-qm",
    "x",
  );
  await git("-C", source, "push", "--quiet", "origin", "HEAD:main");
  writeFileSync(join(source, "app", ".env"), "SECRET=1\n");
  mkdirSync(join(source, "app", "pictures"));

  const copy = new Workspace(
    {
      source,
      workspaces: join(folder, "copies"),
      baseBranch: "main",
      linked: ["app/pictures", "app/gone"],
    },
    "plans",
  );
  await copy.prepareReadOnly();
  assert.equal(existsSync(join(copy.path, "app", "README.md")), true);
  // The owner's settings never come in; the copy's own start from the
  // project's example, which stays as it is.
  assert.equal(
    readFileSync(join(copy.path, "app", ".env"), "utf8"),
    "PORT=3000\n",
  );
  assert.equal(existsSync(join(copy.path, "app", ".env.example")), true);
  assert.equal(
    lstatSync(join(copy.path, "app", "pictures")).isSymbolicLink(),
    true,
  );
  // One left from before is taken out; a branch of its own, committed.
  writeFileSync(join(copy.path, "app", ".env.local"), "SECRET=2\n");
  await copy.prepareLocalBranch("draft/one");
  assert.equal(existsSync(join(copy.path, "app", ".env.local")), false);
  writeFileSync(join(copy.path, "app", "NOTE.md"), "A change");
  const commit = await copy.commitAll("A draft");
  // The example is not deleted in what the copy commits.
  assert.equal(
    await git("-C", copy.path, "show", "--name-status", "--format=", commit),
    "A\tapp/NOTE.md\nA\tapp/pictures\n",
  );
  assert.match(commit, /^[0-9a-f]{40}$/);
  assert.throws(
    () =>
      new Workspace(
        { source, workspaces: folder, baseBranch: "main" },
        "Bad Name",
      ),
    /cannot name/,
  );
});

test("a git lock is waited for, a few times; anything else is not", async () => {
  const waits: number[] = [];
  let tries = 0;
  const done = await retryWhileLocked(
    async () => {
      tries += 1;
      if (tries < 3)
        throw new Error("cannot lock ref 'refs/remotes/origin/main'");
      return "fetched";
    },
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(done, "fetched");
  assert.deepEqual(waits, [2000, 4000]);
  await assert.rejects(
    retryWhileLocked(
      async () => {
        throw new Error("could not read from remote");
      },
      async () => {},
    ),
    /could not read/,
  );
  await assert.rejects(
    run("git", ["no-such-command"]),
    /git no-such-command failed/,
  );
});
