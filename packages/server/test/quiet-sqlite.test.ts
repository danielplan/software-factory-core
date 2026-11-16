import assert from "node:assert/strict";
import { test } from "node:test";

import { quietSqliteWarning } from "../src/quiet-sqlite.ts";

// Node's warning that its SQLite is experimental is kept quiet; every other
// warning is still said, as it was given.

test("only the SQLite warning is kept quiet", () => {
  const said: unknown[][] = [];
  const target = {
    emitWarning: ((...args: unknown[]) => {
      said.push(args);
    }) as NodeJS.Process["emitWarning"],
  };
  quietSqliteWarning(target);
  target.emitWarning(
    "SQLite is an experimental feature and might change at any time",
    "ExperimentalWarning",
  );
  target.emitWarning(
    new Error("SQLite is an experimental feature and might change"),
  );
  target.emitWarning("Something else is experimental", "ExperimentalWarning");
  const error = new Error("Old way");
  target.emitWarning(error);
  assert.deepEqual(said, [
    ["Something else is experimental", "ExperimentalWarning"],
    [error],
  ]);
});
