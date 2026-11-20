import assert from "node:assert/strict";
import { test } from "node:test";

import { clockOf, usageLimitUntil } from "../src/builder/usage-limit.ts";

const now = new Date("2026-11-18T15:00:00Z"); // 16:00 in Rome

test("the limit's reset time, in the zone Claude names, with a small margin", () => {
  const until = usageLimitUntil(
    "You've hit your session limit · resets 7:50pm (Europe/Rome)",
    now,
  );
  assert.equal(until?.toISOString(), "2026-11-18T18:52:00.000Z");
  assert.equal(
    clockOf(new Date("2026-11-18T18:50:00Z"), "Europe/Rome"),
    "19:50",
  );
});

test("a reset time already past today is tomorrow's", () => {
  const until = usageLimitUntil(
    "You've hit your usage limit · resets 9am (Europe/Rome)",
    now,
  );
  assert.equal(until?.toISOString(), "2026-11-19T08:02:00.000Z");
});

test("the older time stamp, an unknown reset, and other errors", () => {
  assert.equal(
    usageLimitUntil(
      "Claude AI usage limit reached|1763491800",
      now,
    )?.toISOString(),
    new Date(1763491800 * 1000 + 120_000).toISOString(),
  );
  assert.equal(
    usageLimitUntil("You've hit your limit", now)?.toISOString(),
    "2026-11-18T16:00:00.000Z",
  );
  assert.equal(usageLimitUntil("spawn claude ENOENT", now), null);
  assert.ok(
    usageLimitUntil("resets 7:50pm (Nowhere/Land) hit your limit", now),
  );
});

test("a paused card waits until the reset, or until the owner writes", async () => {
  const { decide } = await import("../src/builder/decide.ts");
  const { markComment, pausedComment, stripMarker } =
    await import("../src/builder/protocol.ts");
  const until = new Date("2026-11-18T18:52:00Z");
  const paused = pausedComment("Paused.", until);
  assert.equal(stripMarker(paused), "Paused.");
  const card = (more: { body: string; at: string }[]) => ({
    number: 1,
    title: "A",
    url: "",
    body: "",
    stage: "doing" as const,
    closed: false,
    agreedInText: true,
    waitsFor: [],
    thread: more.map((m) => ({ ...m, author: "x", where: "card" as const })),
    pullRequest: null,
    awaitsAnswer: false,
    stuck: false,
  });
  const started = markComment("Started.", "started");
  const before = new Date("2026-11-18T18:00:00Z");
  const after = new Date("2026-11-18T19:00:00Z");
  const pausedCard = card([
    { body: started, at: "0" },
    { body: paused, at: "1" },
  ]);
  assert.equal(decide([pausedCard], new Set(), before).jobs.length, 0);
  assert.equal(decide([pausedCard], new Set(), after).jobs.length, 1);
  const answered = card([
    { body: started, at: "0" },
    { body: paused, at: "1" },
    { body: "Go on now", at: "2" },
  ]);
  assert.equal(decide([answered], new Set(), before).jobs.length, 1);
});
