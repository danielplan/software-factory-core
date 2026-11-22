import assert from "node:assert/strict";
import { test } from "node:test";

import type { PartView } from "../src/api/client.ts";
import { ENGLISH } from "../src/i18n/messages.ts";
import { linesOf, nearOf } from "../src/features/system/system-map-lines.ts";

function part(id: string, dependsOn: string[] = []): PartView {
  return {
    id,
    name: id,
    area: "products",
    does: "Something.",
    type: null,
    dependsOn,
    start: "auto",
    light: "stopped",
    step: null,
    problem: null,
    link: null,
    canStart: true,
    canStop: false,
    outside: false,
  };
}

test("a line runs from each part needed to the part that needs it, only between parts on the map", () => {
  const parts = [
    part("data"),
    part("api", ["data", "payments"]),
    part("web", ["api"]),
    part("phone", ["api"]),
  ];
  assert.deepEqual(linesOf(parts), [
    { id: "data>api", source: "data", target: "api" },
    { id: "api>web", source: "api", target: "web" },
    { id: "api>phone", source: "api", target: "phone" },
  ]);
});

test("pointing at a part brings out it and the parts at the other ends of its lines", () => {
  const lines = linesOf([
    part("data"),
    part("api", ["data"]),
    part("web", ["api"]),
    part("alone"),
  ]);
  assert.equal(nearOf(lines, null), null);
  assert.deepEqual(
    [...(nearOf(lines, "api") ?? [])].sort((a, b) => a.localeCompare(b)),
    ["api", "data", "web"],
  );
  assert.deepEqual([...(nearOf(lines, "alone") ?? [])], ["alone"]);
});

test("each type of part says what it means, in plain words", () => {
  assert.deepEqual(
    Object.entries(ENGLISH("system.types", { returnObjects: true })).map(
      ([type, { label, means }]) => [type, label, means],
    ),
    [
      ["screen", "Screen", "what people open, a web page or app"],
      ["backend", "Backend", "works behind the screens"],
      ["data", "Data", "where data is stored"],
      ["outside", "Outside service", "run by someone else, like payments"],
    ],
  );
});
