import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { faceFrom, KobbleStore } from "@software-factory/core";

import type { CardView, WorkView } from "../src/api.ts";
import type { Cards } from "../src/cards/cards.ts";
import { fixSignal } from "../src/kobble/actions.ts";
import {
  boardIdeas,
  columnOf,
  factoryView,
  type FactoryView,
} from "../src/kobble/factory-view.ts";
import {
  type PersonaPage,
  type PersonaRow,
  type SignalsView,
  signalsView,
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
      address: null,
      last: null,
      next: null,
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
    // Fix needs a connected board, and says how to connect one.
    const fixed = await factory.press("/api/kobble/signals/fix", {
      id: "S-0008",
    });
    assert.equal(fixed.status, 409);
    assert.match(String(fixed.body.error), /^No GitHub board is connected/);
    assert.equal(factory.store.get("signals", "S-0008")?.status, "new");

    // Already explored in X-1: added to it.
    await factory.press("/api/kobble/signals/explore", { id: "S-0004" });
    const x1 = factory.store.get("explorations", "X-1");
    assert.deepEqual(x1?.signals, ["S-0004"]);
    assert.deepEqual(factory.store.get("signals", "S-0004")?.to, "X-1");
    assert.deepEqual(
      factory.store.get("explorations", "X-1")?.heard.map((one) => one.id),
      ["S-0004"],
    );
    // The exploration still says what it heard where the signal file is not
    // (it stays on the computer that read the live app).
    rmSync(join(factory.store.root, "signals", "S-0004.json"));
    const page = await factory.read<{
      heard: { id: string; personaName: string | null }[];
    }>("/api/kobble/exploration?id=X-1");
    assert.deepEqual(
      page.heard.map((one) => [one.id, one.personaName]),
      [["S-0004", "Mia"]],
    );

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
        heard: [
          {
            id: "S-0006",
            type: "request",
            source: "usage",
            persona: "bruno",
            at: "2026-11-16T09:20:00.000Z",
            text: "The assistant could not repeat last Monday's order. It can only show it.",
          },
        ],
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
    assert.equal(view.counts.new, 7);
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
      // Its kobold from what it is: a cap (nothing matches), the colour
      // from its name.
      face: faceFrom({ name: "Gift Buyer" }),
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

test("Fix makes an issue in To do and the signal goes to it; the Factory board shows where things are", async () => {
  const factory = await kobbleFactory(pathToFileURL(EXPORT).href);
  try {
    await factory.press("/api/kobble/sync");
    const made: string[] = [];
    const stages: (string | undefined)[] = [];
    const cards = {
      // Made straight in To do: no read of the board right after adding.
      create: (title: string, _body: string, stage?: string) => {
        made.push(title);
        stages.push(stage);
        return Promise.resolve({ number: 77, url: "https://example.com/77" });
      },
    } as unknown as Cards;
    const signal = await fixSignal(factory.store, "S-0008", () => cards);
    assert.equal(signal.status, "fixed");
    assert.equal(signal.to, "#77");
    assert.deepEqual(made, [
      "Checkout stopped with an error: the payment service took too long to answer",
    ]);
    assert.deepEqual(stages, ["todo"]);
    const x1 = factory.store.get("explorations", "X-1");
    assert.ok(x1);
    factory.store.put("explorations", { ...x1, work: 51 });
    const card = (
      number: number,
      stage: CardView["stage"],
      closed = false,
    ): CardView => ({
      number,
      title: `Card ${String(number)}`,
      stage,
      column: "",
      url: "",
      pullRequest: null,
      closed,
      asks: false,
    });
    const work = {
      cards: [
        card(77, "todo"),
        card(51, "doing"),
        card(41, "review", true),
        card(9, null),
        card(12, "review"),
      ],
      problem: null,
      read: null,
      builder: {
        on: true,
        working: { number: 51, title: "Basket", what: "" },
        also: [],
        activity: null,
        steps: [],
        problem: null,
      },
      coach: { on: false, working: null, also: [], steps: [] },
    } as WorkView;
    const view = factoryView(factory.store, work);
    assert.deepEqual(
      view.columns.map((column) => [
        column.id,
        column.cards.map((c) => c.number),
      ]),
      [
        ["todo", [77]],
        ["building", [51]],
        ["review", [12]],
        ["done", [41]],
      ],
    );
    // A card in no column (or the Backlog) is an idea: it waits in
    // Explorations, not on the Factory page.
    assert.deepEqual(
      boardIdeas(work).map((idea) => idea.number),
      [9],
    );
    assert.deepEqual(view.columns[1]?.cards[0]?.from, {
      exploration: "X-1",
      key: "B",
    });
    assert.equal(view.columns[0]?.cards[0]?.fix, true);
    assert.equal(view.builder.working, "#51 · Basket");
    assert.deepEqual(view.builder.cards, [51]);
    assert.equal(columnOf("#41", work), "Done");
    assert.equal(columnOf("#5", work), null);
    assert.deepEqual(factoryView(factory.store, null).connected, false);
    const signals = signalsView(
      factory.store,
      { connected: true, address: null, last: null, next: null, problem: null },
      work,
    );
    assert.equal(
      signals.signals.find((s) => s.id === "S-0007")?.workColumn,
      "Done",
    );
    const page = await factory.read<FactoryView>("/api/kobble/factory");
    assert.equal(page.connected, false);
  } finally {
    factory.close();
  }
});

test("Connect checks the address with the token once, keeps both in .env, and never shows the token", async () => {
  const tokens: (string | undefined)[] = [];
  const live = createServer((request, response) => {
    tokens.push(request.headers.authorization);
    const right = request.headers.authorization === "Bearer s3cret-token";
    response.writeHead(right ? 200 : 401, {
      "content-type": "application/json",
    });
    response.end(right ? readFileSync(EXPORT, "utf8") : "{}");
  });
  await new Promise<void>((done) => live.listen(0, "127.0.0.1", done));
  const address = live.address();
  assert.ok(address && typeof address === "object");
  const url = `http://127.0.0.1:${String(address.port)}/api/kobble/export`;
  const factory = await kobbleFactory();
  try {
    const wrong = await factory.press("/api/kobble/connect", {
      url,
      token: "nope",
    });
    assert.equal(wrong.status, 409);
    assert.match(String(wrong.body.error), /does not accept the token/);
    assert.equal(existsSync(join(factory.project, ".env")), false);
    assert.match(
      String(
        (
          await factory.press("/api/kobble/connect", {
            url: "http://127.0.0.1:9/export",
            token: "x",
          })
        ).body.error,
      ),
      /cannot be reached at 127\.0\.0\.1:9: check the address/,
    );
    assert.equal(
      (await factory.press("/api/kobble/connect", { url: "", token: "x" })).body
        .error,
      "Say the address of the export.",
    );
    assert.equal(
      (
        await factory.press("/api/kobble/connect", {
          url: "file:///x.json",
          token: "x",
        })
      ).body.error,
      "Use the web address of your app's export.",
    );
    const right = await factory.press("/api/kobble/connect", {
      url,
      token: "s3cret-token",
    });
    assert.equal(right.status, 200);
    assert.equal(right.body.ignored, true);
    assert.doesNotMatch(JSON.stringify(right.body), /s3cret-token/);
    assert.match(
      readFileSync(join(factory.project, ".env"), "utf8"),
      /KOBBLE_LIVE_URL=http:\/\/127\.0\.0\.1:\d+\/api\/kobble\/export\nKOBBLE_LIVE_TOKEN=s3cret-token\n/,
    );
    assert.match(
      readFileSync(join(factory.project, ".gitignore"), "utf8"),
      /^\.env$/m,
    );
    // It reads at once, and says when it reads next.
    let view = await factory.read<SignalsView>("/api/kobble/signals");
    while (view.counts.new < 10)
      view = await factory.read<SignalsView>("/api/kobble/signals");
    assert.equal(view.sync.address, url);
    assert.ok(view.sync.next);
    assert.doesNotMatch(JSON.stringify(view), /s3cret-token/);
    assert.deepEqual(tokens.slice(0, 2), [
      "Bearer nope",
      "Bearer s3cret-token",
    ]);
    // Connecting again leaves .gitignore as it is.
    assert.equal(
      (
        await factory.press("/api/kobble/connect", {
          url,
          token: "s3cret-token",
        })
      ).body.ignored,
      false,
    );
    await factory.press("/api/kobble/signals/dismiss", { id: "S-0011" });
    const handled = await factory.read<{
      signals: { id: string; status: string }[];
    }>("/api/kobble/handled");
    assert.deepEqual(handled.signals.map((s) => [s.id, s.status]).slice(0, 1), [
      ["S-0011", "dismissed"],
    ]);
    // Disconnect takes both lines out of .env.
    const off = await factory.press("/api/kobble/disconnect");
    assert.equal((off.body.sync as { connected: boolean }).connected, false);
    assert.doesNotMatch(
      readFileSync(join(factory.project, ".env"), "utf8"),
      /KOBBLE_LIVE/,
    );
  } finally {
    factory.close();
    live.close();
  }
});
