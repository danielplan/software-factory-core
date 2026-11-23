import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { Board } from "@software-factory/core";

import {
  failedNote,
  failedWords,
} from "../src/extensions/explorations/made.ts";
import { unmadeIn } from "../src/extensions/explorations/unmade.ts";
import { git } from "../src/prototypes/copies.ts";

// A prototype that could not be made: the kobold hears it and must not
// promise it, and a hand-off does not wait for it.

test("the kobold hears that a prototype could not be made, and not to say it is on its way", () => {
  const words = failedWords("A", "git worktree failed: invalid reference");
  assert.match(words, /^\(Not from the team: Prototype A could not be made/);
  assert.match(words, /Never say the maker is still making it/);
  assert.match(words, /hand off from the agreed picture/);
  assert.match(failedNote("A", "x"), /never say it is still being made/);
});

test("a prototype whose branch is nowhere, and not being made, was never made", () => {
  const project = mkdtempSync(join(tmpdir(), "unmade-"));
  try {
    git(project, ["init", "--quiet", "-b", "main"]);
    writeFileSync(join(project, "a.txt"), "a\n");
    git(project, ["add", "a.txt"]);
    git(project, [
      "-c",
      "user.name=t",
      "-c",
      "user.email=t@t",
      "commit",
      "--quiet",
      "-m",
      "a",
    ]);
    git(project, ["branch", "proto/X-1-a"]);
    const prototype = (key: string, branch: string, making = false) =>
      ({
        kind: "prototype",
        key,
        branch,
        making,
      }) as unknown as Board["things"][number];
    const board = {
      things: [
        prototype("A", "proto/X-1-a"),
        prototype("B", "proto/X-1-b"),
        prototype("C", "proto/X-1-c", true),
      ],
    } as unknown as Board;
    assert.deepEqual(unmadeIn(project, board), ["B"]);
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
});
