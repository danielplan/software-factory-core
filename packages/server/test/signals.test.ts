import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import type { Cli } from "../src/extensions/github/github.ts";
import {
  isRelevant,
  Signals,
  verifySignature,
} from "../src/extensions/factory/builder/signals.ts";

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

test("a signal counts only with the factory's signature, and only for its board", () => {
  const body = JSON.stringify({ repository: { full_name: "Co/App" } });
  const signed = `sha256=${createHmac("sha256", "s").update(body).digest("hex")}`;
  assert.ok(verifySignature("s", body, signed));
  assert.ok(!verifySignature("other", body, signed));
  assert.ok(!verifySignature("s", body, undefined));
  assert.ok(isRelevant("issue_comment", JSON.parse(body), "co/app"));
  assert.ok(!isRelevant("issue_comment", JSON.parse(body), "co/other"));
  assert.ok(!isRelevant("star", JSON.parse(body), "co/app"));
  assert.ok(isRelevant("projects_v2_item", {}, "co/app"));
});

function standIn(type: string) {
  const started: string[][] = [];
  const ends: ((code: number) => void)[] = [];
  let stopped = false;
  const cli: Cli = {
    run: () => Promise.resolve({ code: 0, out: `${type}\n`, err: "" }),
    start: (args, onLine) => {
      started.push(args);
      onLine("Forwarding Webhook events from GitHub...");
      return {
        answer: () => undefined,
        done: new Promise<number>((resolve) => {
          ends.push(resolve);
        }),
        stop: () => {
          stopped = true;
          ends.at(-1)?.(0);
        },
      };
    },
  };
  return {
    cli,
    started,
    end: (code: number) => {
      ends.at(-1)?.(code);
    },
    stopped: () => stopped,
  };
}

test("an organisation's board: its card moves come too; lost signals fall back and try again", async () => {
  const gh = standIn("Organization");
  const said: string[] = [];
  const signals = new Signals({
    cli: gh.cli,
    repository: "co/app",
    url: "http://localhost:1/api/github/webhook",
    onLive: (moves) => {
      said.push(`live ${String(moves)}`);
    },
    onLost: () => {
      said.push("lost");
    },
    liveAfterMs: 5,
    retryMs: 5,
  });
  void signals.start();
  await wait(30);
  assert.deepEqual(said, ["live true"]);
  assert.ok(gh.started[0]?.includes("--org=co"));
  assert.ok(gh.started[0]?.some((a) => a.includes("projects_v2_item")));
  assert.deepEqual(signals.view(), { live: true, moves: true, problem: null });
  gh.end(1);
  await wait(5);
  assert.deepEqual(said, ["live true", "lost"]);
  assert.match(signals.view().problem ?? "", /read every minute/);
  await wait(40);
  assert.equal(gh.started.length, 2);
  signals.stop();
  assert.ok(gh.stopped());
});

test("a personal account's board: signals for the repository only", async () => {
  const gh = standIn("User");
  const signals = new Signals({
    cli: gh.cli,
    repository: "me/app",
    url: "http://localhost:1/x",
    onLive: () => undefined,
    onLost: () => undefined,
    liveAfterMs: 5,
  });
  void signals.start();
  await wait(20);
  assert.ok(gh.started[0]?.includes("--repo=me/app"));
  assert.ok(!gh.started[0]?.some((a) => a.includes("projects_v2_item")));
  signals.stop();
});
