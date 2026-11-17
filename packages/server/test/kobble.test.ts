import assert from "node:assert/strict";
import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { faceFor, KobbleStore } from "@software-factory/core";

import type {
  PersonaPage,
  PersonaRow,
  SignalsView,
} from "../src/kobble/views.ts";
import { stage } from "./stage.ts";

// Kobble's Signals and Personas as the server serves them: the sync with
// the live app (the example company's export as a file, and a stand-in live
// app), and what the buttons change in the files.

const ACME = join(import.meta.dirname, "..", "..", "..", "examples", "acme");
const EXPORT = join(ACME, "live-export.json");

// A factory with the example company's Kobble files, and the live app set
// in the project's .env when an address is given.
async function kobbleFactory(live?: string) {
  const staged = await stage();
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  cpSync(join(ACME, "factory", "kobble"), join(root, "kobble"), {
    recursive: true,
  });
  if (live)
    writeFileSync(
      join(staged.project, ".env"),
      `KOBBLE_LIVE_URL=${live}\nKOBBLE_LIVE_TOKEN=secret\n`,
    );
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const press = async (path: string, body: unknown = {}) => {
    const response = await staged.post(path, body);
    return {
      status: response.status,
      body: (await response.json()) as Record<string, unknown>,
    };
  };
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return { ...staged, root, read, press, close, store: new KobbleStore(root) };
}

test("before the live app is set up, sync is simply off", async () => {
  const factory = await kobbleFactory();
  try {
    const view = await factory.read<SignalsView>("/api/kobble/signals");
    // Only the two the example's persona test filed.
    assert.deepEqual(
      view.signals.map((s) => s.id),
      ["S-0003", "S-0002"],
    );
    assert.deepEqual(view.counts, { new: 2 });
    assert.deepEqual(view.sync, {
      connected: false,
      last: null,
      problem: null,
    });
    assert.deepEqual((await factory.press("/api/kobble/sync")).body.added, 0);
  } finally {
    factory.close();
  }
});

test("in setup there are no Kobble records yet", async () => {
  const { session, server, base } = await stage();
  try {
    const response = await fetch(`${base}/api/kobble/signals`);
    assert.equal(response.status, 409);
  } finally {
    session.close();
    server.close();
  }
});

test("a sync takes in the export once, newest first, with what exists already", async () => {
  const factory = await kobbleFactory(pathToFileURL(EXPORT).href);
  const events = await fetch(`${factory.base}/api/events`);
  const stream = events.body!.getReader();
  try {
    const first = await factory.press("/api/kobble/sync");
    assert.equal(first.body.added, 8);
    let told = "";
    while (!told.includes("kobble-changed")) {
      const { value } = await stream.read();
      told += new TextDecoder().decode(value);
    }
    const view = await factory.read<SignalsView>("/api/kobble/signals");
    assert.equal(view.counts.new, 10);
    assert.deepEqual(
      view.signals.slice(0, 3).map((s) => [s.id, s.personaName, s.already?.id]),
      [
        ["S-0011", "Mia", "X-1"],
        ["S-0010", null, undefined],
        ["S-0009", "Noah", undefined],
      ],
    );
    assert.equal(view.sync.connected, true);
    assert.equal(view.sync.problem, null);
    assert.ok(view.sync.last);
    assert.deepEqual(factory.store.sync().cursor, "2026-11-17T08:40:00.000Z");
    // The same export again: nothing new.
    assert.equal((await factory.press("/api/kobble/sync")).body.added, 0);
    assert.equal(factory.store.all("signals").length, 11);
  } finally {
    await stream.cancel();
    factory.close();
  }
});

test("the live app is asked from the cursor, with the token", async () => {
  const asked: { since: string | null; token: string | undefined }[] = [];
  let status = 200;
  const live = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    asked.push({
      since: url.searchParams.get("since"),
      token: request.headers.authorization,
    });
    response.writeHead(status, { "content-type": "application/json" });
    response.end(
      status === 200 ? readFileSync(EXPORT, "utf8") : '{"error":"no"}',
    );
  });
  await new Promise<void>((done) => live.listen(0, "127.0.0.1", done));
  const address = live.address();
  assert.ok(address && typeof address === "object");
  const factory = await kobbleFactory(
    `http://127.0.0.1:${String(address.port)}/api/kobble/export`,
  );
  try {
    assert.equal((await factory.press("/api/kobble/sync")).body.added, 8);
    assert.equal((await factory.press("/api/kobble/sync")).body.added, 0);
    assert.deepEqual(asked, [
      { since: null, token: "Bearer secret" },
      { since: "2026-11-17T08:40:00.000Z", token: "Bearer secret" },
    ]);
    // A failed sync keeps the signals and says why.
    status = 401;
    const failed = await factory.press("/api/kobble/sync");
    assert.deepEqual(failed.body.added, 0);
    const view = await factory.read<SignalsView>("/api/kobble/signals");
    assert.equal(view.counts.new, 10);
    assert.match(view.sync.problem ?? "", /does not accept the token/);
    status = 500;
    await factory.press("/api/kobble/sync");
    assert.match(
      (await factory.read<SignalsView>("/api/kobble/signals")).sync.problem ??
        "",
      /answered with an error \(500\)/,
    );
  } finally {
    factory.close();
    live.close();
  }
});

test("a sync that cannot read the export says why", async () => {
  const missing = await kobbleFactory(
    pathToFileURL(join(ACME, "nope.json")).href,
  );
  try {
    await missing.press("/api/kobble/sync");
    const { sync } = await missing.read<SignalsView>("/api/kobble/signals");
    assert.match(sync.problem ?? "", /export file cannot be read/);
  } finally {
    missing.close();
  }
  const wrong = await kobbleFactory(
    pathToFileURL(join(ACME, "README.md")).href,
  );
  try {
    writeFileSync(join(wrong.project, "export.json"), '{"events": 3}');
    writeFileSync(
      join(wrong.project, ".env"),
      `KOBBLE_LIVE_URL=${pathToFileURL(join(wrong.project, "export.json")).href}\n`,
    );
    await wrong.press("/api/kobble/sync");
    const { sync } = await wrong.read<SignalsView>("/api/kobble/signals");
    assert.match(sync.problem ?? "", /answer does not fit/);
    writeFileSync(
      join(wrong.project, ".env"),
      "KOBBLE_LIVE_URL=not an address\n",
    );
    await wrong.press("/api/kobble/sync");
    const later = await wrong.read<SignalsView>("/api/kobble/signals");
    assert.match(later.sync.problem ?? "", /not a web address/);
  } finally {
    wrong.close();
  }
});

test("Fix, Explore, Add to and Dismiss change the signal and its exploration", async () => {
  const factory = await kobbleFactory(pathToFileURL(EXPORT).href);
  try {
    await factory.press("/api/kobble/sync");
    // Only the factory's page may press them.
    assert.equal(
      (await factory.post("/api/kobble/signals/fix", { id: "S-0004" }, false))
        .status,
      403,
    );
    const fixed = await factory.press("/api/kobble/signals/fix", {
      id: "S-0008",
    });
    assert.equal((fixed.body.signal as { status: string }).status, "fixed");
    assert.equal(factory.store.get("signals", "S-0008")?.to, null);

    // Already explored in X-1: added to it.
    await factory.press("/api/kobble/signals/explore", { id: "S-0004" });
    const x1 = factory.store.get("explorations", "X-1");
    assert.deepEqual(x1?.signals, ["S-0004"]);
    assert.deepEqual(factory.store.get("signals", "S-0004")?.to, "X-1");

    // Nothing found: a new exploration, waiting.
    const made = await factory.press("/api/kobble/signals/explore", {
      id: "S-0006",
    });
    assert.deepEqual(
      { ...(made.body.exploration as object), created: "" },
      {
        id: "X-4",
        title: "The assistant could not repeat last Monday's order",
        status: "waiting",
        personas: ["bruno"],
        signals: ["S-0006"],
        problem:
          "The assistant could not repeat last Monday's order. It can only show it.",
        created: "",
        work: null,
      },
    );
    await factory.press("/api/kobble/signals/dismiss", { id: "S-0005" });
    assert.equal(factory.store.get("signals", "S-0005")?.status, "dismissed");

    // Handled signals leave the list, and are not handled twice.
    const view = await factory.read<SignalsView>("/api/kobble/signals");
    assert.equal(view.counts.new, 6);
    const again = await factory.press("/api/kobble/signals/dismiss", {
      id: "S-0005",
    });
    assert.equal(again.status, 409);
    assert.equal(
      again.body.error,
      "Signal S-0005 is handled already (dismissed).",
    );
    assert.equal(
      (await factory.press("/api/kobble/signals/fix", { id: "S-0404" })).body
        .error,
      "There is no signal “S-0404”.",
    );
    assert.equal(
      (await factory.press("/api/kobble/signals/fix", {})).body.error,
      "Say which id.",
    );
  } finally {
    factory.close();
  }
});

test("an exploration that is no longer open gets no more signals", async () => {
  const factory = await kobbleFactory(pathToFileURL(EXPORT).href);
  try {
    await factory.press("/api/kobble/sync");
    const x1 = factory.store.get("explorations", "X-1");
    assert.ok(x1);
    factory.store.put("explorations", { ...x1, status: "dropped" });
    const made = await factory.press("/api/kobble/signals/explore", {
      id: "S-0011",
    });
    assert.equal((made.body.exploration as { id: string }).id, "X-4");
  } finally {
    factory.close();
  }
});

test("personas: listed with their signals, one with all of theirs, a new one", async () => {
  const factory = await kobbleFactory(pathToFileURL(EXPORT).href);
  try {
    await factory.press("/api/kobble/sync");
    await factory.press("/api/kobble/signals/dismiss", { id: "S-0004" });
    const { personas } = await factory.read<{ personas: PersonaRow[] }>(
      "/api/kobble/personas",
    );
    assert.deepEqual(
      personas.map((p) => [p.id, p.origin, p.signals]),
      [
        ["bruno", "developer", 2],
        ["mia", "developer", 4],
        ["noah", "usage", 1],
      ],
    );
    // Each has a face: its own, or the one from its id.
    assert.deepEqual(personas[1]?.face, { hat: "phones", color: "pink" });
    const mia = await factory.read<PersonaPage>("/api/kobble/persona?id=mia");
    assert.equal(mia.persona.name, "Mia");
    assert.deepEqual(mia.signals[0]?.personaFace, {
      hat: "phones",
      color: "pink",
    });
    assert.deepEqual(
      mia.signals.map((s) => [s.id, s.status]),
      [
        ["S-0011", "new"],
        ["S-0004", "dismissed"],
        ["S-0003", "new"],
        ["S-0002", "new"],
      ],
    );
    assert.deepEqual(
      mia.tests.map((t) => t.id),
      ["T-0003", "T-0002", "T-0001"],
    );
    const none = await fetch(`${factory.base}/api/kobble/persona?id=zoe`);
    assert.equal(none.status, 409);

    const added = await factory.press("/api/kobble/personas", {
      name: "Gift Buyer",
      place: "Vienna",
      about: "Sends gifts early.",
    });
    assert.deepEqual(added.body.persona, {
      id: "gift-buyer",
      name: "Gift Buyer",
      place: "Vienna",
      about: "Sends gifts early.",
      origin: "developer",
      customers: [],
      face: faceFor("gift-buyer"),
    });
    const twin = await factory.press("/api/kobble/personas", {
      name: "Gift buyer",
      face: { hat: "beret", color: "violet" },
    });
    assert.equal((twin.body.persona as { id: string }).id, "gift-buyer-2");
    assert.deepEqual((twin.body.persona as { face: unknown }).face, {
      hat: "beret",
      color: "violet",
    });
    // The kobold's own floppy cap is never a persona's.
    const flop = await factory.press("/api/kobble/personas", {
      name: "Copy",
      face: { hat: "flop", color: "blue" },
    });
    assert.equal(flop.status, 409);
    const nameless = await factory.press("/api/kobble/personas", { name: " " });
    assert.equal(nameless.status, 409);
    assert.equal(nameless.body.error, "Say the persona's name.");
  } finally {
    factory.close();
  }
});

test("a Kobble file that does not fit is refused with its name", async () => {
  const factory = await kobbleFactory();
  try {
    writeFileSync(join(factory.store.root, "personas", "mia.json"), "{}");
    const response = await fetch(`${factory.base}/api/kobble/personas`);
    assert.equal(response.status, 409);
    assert.match(
      ((await response.json()) as { error: string }).error,
      /^personas\/mia.json does not fit/,
    );
  } finally {
    factory.close();
  }
});
