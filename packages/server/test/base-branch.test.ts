import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import {
  baseBranchFor,
  baseBranchFrom,
  baseBranchOf,
} from "../src/base-branch.ts";

// The branch a project's work goes into: the code host's when there is one,
// otherwise origin's HEAD, then the remote's default, then main.

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("/usr/bin/git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });
}

// A remote whose default branch is trunk, with one commit on it.
function remoteOnTrunk(): { base: string; remote: string } {
  const base = mkdtempSync(join(tmpdir(), "base-branch-"));
  made.push(base);
  const remote = join(base, "remote.git");
  const work = join(base, "work");
  git(base, "init", "--quiet", "--bare", "--initial-branch=trunk", remote);
  git(base, "init", "--quiet", "--initial-branch=trunk", work);
  git(work, "config", "user.email", "test@example.com");
  git(work, "config", "user.name", "Test");
  writeFileSync(join(work, "readme.md"), "one\n");
  git(work, "add", ".");
  git(work, "commit", "--quiet", "-m", "First");
  git(work, "push", "--quiet", remote, "trunk");
  return { base, remote };
}

test("a clone follows what origin's HEAD points to", async () => {
  const { base, remote } = remoteOnTrunk();
  const clone = join(base, "clone");
  git(base, "clone", "--quiet", remote, clone);
  assert.equal(await baseBranchOf(clone), "trunk");
});

test("without origin's HEAD, the remote says its default", async () => {
  const { base, remote } = remoteOnTrunk();
  const added = join(base, "added");
  git(base, "init", "--quiet", "--initial-branch=other", added);
  git(added, "remote", "add", "origin", remote);
  assert.equal(await baseBranchOf(added), "trunk");
});

test("with no remote at all, main is the last resort", async () => {
  const lone = mkdtempSync(join(tmpdir(), "base-branch-lone-"));
  made.push(lone);
  git(lone, "init", "--quiet", "--initial-branch=other", lone);
  assert.equal(await baseBranchOf(lone), "main");
});

test("each way is tried in turn", async () => {
  const asked: string[] = [];
  const answers = (head: string | null, remote: string | null) =>
    baseBranchFrom((args) => {
      asked.push(args[0] ?? "");
      return Promise.resolve(args[0] === "symbolic-ref" ? head : remote);
    });
  assert.equal(await answers("origin/develop\n", null), "develop");
  assert.deepEqual(asked, ["symbolic-ref"]);
  assert.equal(
    await answers(null, "ref: refs/heads/release/2\tHEAD\nabc123\tHEAD\n"),
    "release/2",
  );
  assert.equal(await answers(null, null), "main");
});

test("the code host says it first; git when it cannot", async () => {
  const { base, remote } = remoteOnTrunk();
  const clone = join(base, "clone");
  git(base, "clone", "--quiet", remote, clone);
  const host = (named: Promise<string>) => ({ baseBranch: () => named });
  assert.equal(
    await baseBranchFor(clone, host(Promise.resolve("develop"))),
    "develop",
  );
  assert.equal(
    await baseBranchFor(clone, host(Promise.reject(new Error("offline")))),
    "trunk",
  );
  assert.equal(await baseBranchFor(clone, null), "trunk");
});
