import assert from "node:assert/strict";
import { test } from "node:test";

// The tests' own git repositories never reach the real one: git's variables
// from a hook (commit, push) are gone before any test runs
// (scripts/test-setup.mjs, loaded by the test commands).
test("no test inherits a hook's pointers to the real repository", () => {
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE"])
    assert.equal(process.env[name], undefined, name);
});
