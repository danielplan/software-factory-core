import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import { join } from "node:path";
import { test } from "node:test";

import type { State } from "../src/api.ts";
import { stage } from "./stage.ts";

// The factory's folder, as the coach makes it when it names the company
// (the coach's tests make the rest), and its settings saved from the page.

test("the factory's folder comes first, once, and its settings save from the page", async () => {
  const { project, session, server, base, post } = await stage();
  try {
    const state = (await (await fetch(`${base}/api/state`)).json()) as State;
    assert.equal(state.mode, "setup");
    assert.deepEqual(
      state.kits.map((k) => [k.id, k.canCreate]),
      [["web-kit", true]],
    );
    assert.deepEqual(
      await (await post("/api/settings", { group: "jira", values: {} })).json(),
      { error: "There is no such setting." },
    );

    // In the project, which its own rules point to.
    const root = session.createCompany({
      name: "Acme Garden",
      about: "Garden tools.",
    });
    assert.equal(root, join(project, "factory"));
    assert.match(
      readFileSync(join(project, "AGENTS.md"), "utf8"),
      /factory\/AGENTS\.md/,
    );
    const empty = session.state();
    assert.ok(empty.mode === "factory");
    assert.deepEqual(empty.products, []);
    assert.equal(empty.company.tracker, "none");
    assert.deepEqual(empty.board, {});
    assert.throws(
      () => session.createCompany({ name: "Again", about: "" }),
      /has its company already/,
    );

    // A wrong value is refused, with why; a secret is never sent back.
    const wrong = (await (
      await post("/api/settings", {
        group: "jira",
        values: { JIRA_PROJECT: "ACME" },
      })
    ).json()) as { refused: Record<string, string> };
    assert.match(wrong.refused.JIRA_PROJECT ?? "", /Not a setting here/);
    const saved = (await (
      await post("/api/settings", {
        group: "jira",
        values: { JIRA_TOKEN: "secret-1" },
      })
    ).json()) as { refused: Record<string, string> };
    assert.deepEqual(saved.refused, {});
    assert.match(
      readFileSync(join(root, "settings", "tracker.env"), "utf8"),
      /JIRA_TOKEN=secret-1/,
    );
    const tracked = session.state();
    assert.ok(tracked.mode === "factory");
    const jira = tracked.settings.find((g) => g.id === "jira");
    assert.equal(
      jira?.fields.find((f) => f.key === "JIRA_TOKEN")?.value,
      "(set)",
    );
  } finally {
    session.close();
    server.close();
  }
});

test("only this computer, and only the factory's page, may press its buttons", async () => {
  const { session, server, base, post } = await stage();
  try {
    assert.equal((await post("/api/stop-all", {}, false)).status, 403);
    assert.equal((await post("/api/stop-all", {})).status, 409);
    // fetch() keeps its own Host header: node:http lets the test send another.
    const elsewhere = await new Promise<number>((resolve, reject) => {
      const asked = request(
        `${base}/api/state`,
        { headers: { host: "example.com" } },
        (answer) => {
          resolve(answer.statusCode ?? 0);
          answer.resume();
        },
      );
      asked.on("error", reject);
      asked.end();
    });
    assert.equal(elsewhere, 403);
    assert.equal((await fetch(`${base}/api/nothing`)).status, 404);
    // Any other address is the page, which runs in the browser.
    assert.match(await (await fetch(`${base}/system`)).text(), /The factory/);
    assert.throws(
      () => session.createCompany({ name: " ", about: "" }),
      /Give the project a name/,
    );
  } finally {
    session.close();
    server.close();
  }
});
