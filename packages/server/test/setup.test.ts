import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { defineKit } from "@software-factory/core";
import { templateFolder } from "@software-factory/knowledge-base";
import { templatesFolder } from "@software-factory/method";

import type { State } from "../src/api.ts";
import { PAGE_HEADER, startServer } from "../src/server.ts";
import { Session } from "../src/session.ts";
import { trackers } from "../src/trackers.ts";

// The setup flow through the server, as the page uses it: products found in
// existing code, a new one made with its kit's starter, the tracker saved,
// and the factory open afterwards.

const web = defineKit({
  id: "web-kit",
  name: "Web kit",
  about: "A stand-in for web apps.",
  kind: "web-app",
  commands: { start: "npm run dev" },
  port: 5173,
  detect: (folder) =>
    existsSync(join(folder, "web.txt"))
      ? { name: "Found app", commands: { verify: "npm test" } }
      : null,
  // Makes the folder with a file in it, as a real starter would.
  create: (folder) => [
    [
      process.execPath,
      "-e",
      `require("fs").mkdirSync(${JSON.stringify(folder)}, { recursive: true })`,
    ],
  ],
});

async function stage() {
  const home = mkdtempSync(join(tmpdir(), "setup-"));
  const session = new Session({
    root: null,
    factoriesFolder: join(home, "Factories"),
    available: { extensions: [trackers], kits: [web] },
    templates: {
      knowledgeBase: templateFolder,
      agents: join(templatesFolder, "AGENTS.md"),
    },
    onChange: () => {},
  });
  const page = join(home, "page");
  mkdirSync(page);
  writeFileSync(join(page, "index.html"), "<p>The factory</p>");
  // Port 0: the system picks a free one.
  const { server } = startServer({ session, page, port: 0 });
  await new Promise((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const base = `http://localhost:${String(address.port)}`;
  const post = async (path: string, body: unknown, header = true) =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: header ? { [PAGE_HEADER]: "1" } : {},
      body: JSON.stringify(body),
    });
  return { home, session, server, base, post };
}

test("setup in the dashboard: the company first, then products found and made, then the tracker", async () => {
  const { home, session, server, base, post } = await stage();
  try {
    const code = join(home, "code");
    mkdirSync(join(code, "shop"), { recursive: true });
    writeFileSync(join(code, "shop", "web.txt"), "");
    const state = (await (await fetch(`${base}/api/state`)).json()) as State;
    assert.equal(state.mode, "setup");
    assert.deepEqual(
      state.kits.map((k) => [k.id, k.canCreate]),
      [["web-kit", true]],
    );
    // Nothing but the company can come first.
    assert.deepEqual(
      await (await post("/api/products", { products: [] })).json(),
      { error: "Name your company first." },
    );

    const created = await post("/api/company", {
      name: "Acme Garden",
      about: "Garden tools.",
    });
    const root = join(home, "Factories", "acme-garden");
    assert.equal(await created.json(), root);
    const empty = session.state();
    assert.ok(empty.mode === "factory");
    assert.deepEqual(empty.products, []);
    assert.equal(empty.company.tracker, "none");
    assert.equal(
      (await post("/api/company", { name: "Again", about: "" })).status,
      409,
    );

    const detected = (await (
      await post("/api/setup/detect", { folder: code })
    ).json()) as { candidates: { id: string; name: string; port?: number }[] };
    assert.deepEqual(
      detected.candidates.map((c) => [c.id, c.name, c.port]),
      [["shop", "Found app", 5173]],
    );
    const shop = {
      id: "shop",
      name: "Shop",
      kind: "web-app",
      folder: join(code, "shop"),
      about: "",
      port: 5173,
      isNew: false,
    };
    const blog = {
      id: "blog",
      name: "Blog",
      kind: "web-app",
      folder: join(code, "blog"),
      about: "News.",
      port: 5174,
      isNew: true,
    };
    assert.equal(
      (await post("/api/products", { products: [shop, blog] })).status,
      200,
    );
    assert.ok(existsSync(join(code, "blog")));
    const open = session.state();
    assert.ok(open.mode === "factory");
    assert.deepEqual(open.company.kits, ["web-kit"]);
    assert.deepEqual(
      open.products.map((p) => p.id),
      ["blog", "shop"],
    );
    assert.deepEqual(open.problems, []);
    assert.deepEqual(
      open.jobs.map((j) => [j.id, j.state]),
      [["blog", "done"]],
    );
    assert.deepEqual(
      await (await post("/api/products", { products: [shop] })).json(),
      { error: 'There is a product "shop" already.' },
    );

    // The tracker: a wrong value refuses all of it; then it is saved.
    const wrong = (await (
      await post("/api/company/tracker", {
        tracker: "jira",
        settings: { JIRA_PROJECT: "lowercase" },
      })
    ).json()) as { refused: Record<string, string> };
    assert.match(wrong.refused.JIRA_PROJECT ?? "", /does not look right/);
    await post("/api/company/tracker", {
      tracker: "jira",
      settings: { JIRA_SITE: "acme.atlassian.net", JIRA_TOKEN: "secret-1" },
    });
    assert.match(
      readFileSync(join(root, "settings", "tracker.env"), "utf8"),
      /JIRA_TOKEN=secret-1/,
    );
    const tracked = session.state();
    assert.ok(tracked.mode === "factory");
    assert.equal(tracked.company.tracker, "jira");
    // The secret is never sent back, only that it is set.
    const jira = tracked.settings.find((g) => g.id === "jira");
    assert.equal(
      jira?.fields.find((f) => f.key === "JIRA_TOKEN")?.value,
      "(set)",
    );
    assert.equal(
      (await post("/api/company/tracker", { tracker: "slack" })).status,
      409,
    );
    const saved = (await (
      await post("/api/settings", {
        group: "jira",
        values: { JIRA_PROJECT: "ACME" },
      })
    ).json()) as { refused: Record<string, string> };
    assert.deepEqual(saved.refused, {});
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
    assert.equal(
      (await post("/api/setup/detect", { folder: "/no/such/folder" })).status,
      409,
    );
    const nameless = await post("/api/company", { name: " ", about: "" });
    assert.deepEqual(await nameless.json(), {
      error: "Give the company a name.",
    });
    const folders = (await (
      await fetch(`${base}/api/folders?path=/`)
    ).json()) as { parent: string | null };
    assert.equal(folders.parent, null);
  } finally {
    session.close();
    server.close();
  }
});
