import assert from "node:assert/strict";
import { test } from "node:test";

import { columnsOf } from "../src/explorations/view.ts";

// An exploration's board in small, in the list: its things in columns
// along their arrows.

const thing = (id: string) => ({ id, kind: "note", agreed: false });

test("things go one column past what points to them, at most four a column", () => {
  const things = ["problem", "choice", "a", "b", "note"].map(thing);
  const columns = columnsOf(things, [
    { from: "problem", to: "choice" },
    { from: "choice", to: "a" },
    { from: "choice", to: "b" },
    { from: "note", to: "choice" },
  ]);
  assert.deepEqual(
    columns.map((column) => column.map((one) => one.id)),
    [["problem", "note"], ["choice"], ["a", "b"]],
  );
  const many = Array.from({ length: 6 }, (_, at) => thing(`n${String(at)}`));
  assert.equal(columnsOf(many, [])[0]?.length, 4);
  // A loop does not go on for ever.
  assert.ok(
    columnsOf(
      [thing("x"), thing("y")],
      [
        { from: "x", to: "y" },
        { from: "y", to: "x" },
      ],
    ).length <= 3,
  );
});
