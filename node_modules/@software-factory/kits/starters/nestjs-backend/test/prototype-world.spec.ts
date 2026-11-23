import assert from "node:assert/strict";
import * as schema from "../src/database/schema.js";
import { problemsIn, situationsIn, tablesOf } from "./world.js";

// The made-up world follows the schema: every situation in prototype-world/
// lists every table of the database and no other, and every row is one the
// database would take. A schema change updates every situation in the same
// change. `npm run check:world` runs only this file (the factory's world
// check); `npm run test:integration` also writes each situation into the test
// database.

const situations = situationsIn();

test("there are situations", () => {
  assert.ok(situations.length > 0);
});

test.each(situations)("$key fits the database", ({ situation }) => {
  assert.ok(situation.name.trim(), "a situation has a name");
  assert.deepEqual(problemsIn(situation, tablesOf(schema)), []);
});
