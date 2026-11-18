import assert from "node:assert/strict";
import { test } from "node:test";

import { toStart } from "../src/explorations/board/prototype-shown.ts";
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

// The board starts its prototype by itself, so the canvas shows the real
// screen.

const pageWith = (
  status: string,
  things: { kind: string; key?: string; agreed: boolean }[],
  runs: { version: string; state: string }[],
) => ({ exploration: { status }, board: { things }, runs }) as never;

test("the agreed prototype starts, otherwise the newest, when none runs", () => {
  const a = { kind: "prototype", key: "A", agreed: false };
  const b = { kind: "prototype", key: "B", agreed: false };
  assert.equal(toStart(pageWith("exploring", [a, b], [])), "B");
  assert.equal(
    toStart(pageWith("exploring", [{ ...a, agreed: true }, b], [])),
    "A",
  );
  assert.equal(
    toStart(
      pageWith("exploring", [a, b], [{ version: "A", state: "running" }]),
    ),
    null,
  );
  assert.equal(
    toStart(pageWith("exploring", [a], [{ version: "A", state: "failed" }])),
    null,
  );
  assert.equal(toStart(pageWith("handed-off", [a], [])), null);
  assert.equal(toStart(pageWith("exploring", [], [])), null);
});
