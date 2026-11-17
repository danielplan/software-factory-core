import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  checkKobbleIn,
  faceFor,
  faceOf,
  type KobbleSignal,
  KobbleRefused,
  KobbleStore,
  liveExportSchema,
  PERSONA_COLORS,
  PERSONA_HATS,
  takeInEvents,
} from "../src/index.ts";
import { signalFromEvent } from "../src/kobble/live.ts";
import { ACME } from "./stand-ins.ts";

// Kobble's records as files in the product's repository: what fits, how
// they are kept, the live app's export as signals, and the check.

function emptyFactory(): KobbleStore {
  return new KobbleStore(mkdtempSync(join(tmpdir(), "kobble-")));
}

// The example company's factory folder, copied, so writes stay in the copy.
function acmeFactory(): string {
  const folder = join(mkdtempSync(join(tmpdir(), "kobble-acme-")), "factory");
  cpSync(ACME, folder, { recursive: true });
  return folder;
}

const signal = (
  id: string,
  more: Partial<KobbleSignal> = {},
): KobbleSignal => ({
  id,
  type: "bug",
  source: "app",
  sourceId: `ev-${id}`,
  customer: null,
  persona: null,
  at: "2026-11-17T08:00:00.000Z",
  text: "Something broke.",
  status: "new",
  to: null,
  already: null,
  ...more,
});

function refusal(write: () => unknown): string {
  try {
    write();
  } catch (error) {
    assert.ok(error instanceof KobbleRefused, String(error));
    return error.message;
  }
  assert.fail("It was not refused.");
}

test("each record is one pretty JSON file, read back the same", () => {
  const store = emptyFactory();
  assert.deepEqual(store.all("signals"), []);
  store.put("signals", signal("S-0002"));
  store.put("signals", signal("S-0010"));
  store.put("explorations", {
    id: "X-1",
    title: "Basket",
    status: "waiting",
    personas: [],
    signals: ["S-0002"],
    problem: "",
    created: "2026-11-17T08:00:00.000Z",
    work: null,
  });
  const file = join(store.root, "signals", "S-0002.json");
  const text = readFileSync(file, "utf8");
  assert.ok(text.endsWith("}\n"));
  assert.ok(text.includes('\n  "type": "bug",\n'));
  assert.deepEqual(store.get("signals", "S-0002"), signal("S-0002"));
  assert.ok(
    existsSync(join(store.root, "explorations", "X-1", "exploration.json")),
  );
  assert.deepEqual(
    store.all("signals").map((one) => one.id),
    ["S-0002", "S-0010"],
  );
  // Nothing half-written is left beside them.
  assert.deepEqual(readdirSync(join(store.root, "signals")), [
    "S-0002.json",
    "S-0010.json",
  ]);
  assert.equal(store.nextId("signals"), "S-0011");
  assert.equal(store.nextId("explorations"), "X-2");
  assert.equal(emptyFactory().nextId("signals"), "S-0001");
  assert.equal(store.get("signals", "S-0003"), null);
  assert.equal(store.get("signals", "../S-0002"), null);
});

test("a record that does not fit is refused, with why", () => {
  const store = emptyFactory();
  assert.match(
    refusal(() =>
      store.put("signals", { ...signal("S-1"), type: "wish" as "bug" }),
    ),
    /This signal does not fit: .*id[\s\S]*type/,
  );
  assert.match(
    refusal(() =>
      store.put("personas", {
        id: "Mia Rossi",
        name: "Mia",
        place: "",
        about: "",
        origin: "developer",
        customers: [],
      }),
    ),
    /This persona does not fit/,
  );
  assert.match(
    refusal(() => store.put("signals", signal("S-0001", { at: "today" }))),
    /at/,
  );
  assert.match(
    refusal(() => {
      store.remove("signals", "S-0009");
    }),
    /no signal/,
  );
});

test("a file that does not fit, or is broken, is refused with its name", () => {
  const store = emptyFactory();
  mkdirSync(join(store.root, "signals"), { recursive: true });
  writeFileSync(join(store.root, "signals", "S-0001.json"), "{ not json");
  assert.match(
    refusal(() => store.all("signals")),
    /signals\/S-0001.json cannot be read/,
  );
  writeFileSync(
    join(store.root, "signals", "S-0001.json"),
    JSON.stringify(signal("S-0002")),
  );
  assert.match(
    refusal(() => store.all("signals")),
    /id of another signal/,
  );
  writeFileSync(join(store.root, "sync.json"), '{"last": 3}');
  assert.match(
    refusal(() => store.sync()),
    /sync.json does not fit/,
  );
});

test("records are removed, and the sync's place is kept", () => {
  const store = emptyFactory();
  assert.deepEqual(store.sync(), { last: null, cursor: null });
  store.saveSync({ last: "2026-11-17T08:00:00.000Z", cursor: "abc" });
  assert.deepEqual(store.sync(), {
    last: "2026-11-17T08:00:00.000Z",
    cursor: "abc",
  });
  store.put("signals", signal("S-0001"));
  store.remove("signals", "S-0001");
  assert.deepEqual(store.all("signals"), []);
  store.put("explorations", {
    id: "X-3",
    title: "T",
    status: "dropped",
    personas: [],
    signals: [],
    problem: "",
    created: "2026-11-17T08:00:00.000Z",
    work: null,
  });
  store.remove("explorations", "X-3");
  assert.equal(existsSync(join(store.root, "explorations", "X-3")), false);
});

test("each kind of live event becomes its type and source, with its persona", () => {
  const personas = [
    {
      id: "mia",
      name: "Mia",
      place: "",
      about: "",
      origin: "developer" as const,
      customers: ["c-1"],
    },
  ];
  const as = (kind: string, customer: string | null = null) => {
    const event = liveExportSchema.parse({
      cursor: "",
      events: [
        { id: "e", at: "2026-11-17T08:00:00Z", kind, customer, text: "Hi" },
      ],
    }).events[0];
    assert.ok(event);
    const made = signalFromEvent(event, "S-0001", personas);
    return [made.type, made.source, made.persona];
  };
  assert.deepEqual(as("bug-report", "c-1"), ["bug", "app", "mia"]);
  assert.deepEqual(as("suggestion", "c-2"), ["request", "app", null]);
  assert.deepEqual(as("limit"), ["request", "usage", null]);
  assert.deepEqual(as("automation-failed"), ["bug", "errors", null]);
  assert.deepEqual(as("error"), ["bug", "errors", null]);
  assert.deepEqual(as("other"), ["feedback", "usage", null]);
  assert.equal(
    liveExportSchema.safeParse({
      cursor: "",
      events: [{ id: "e", at: "now", kind: "rant", customer: null, text: "" }],
    }).success,
    false,
  );
});

test("the example company's export comes in once, with what exists already", () => {
  const factory = acmeFactory();
  const store = new KobbleStore(factory);
  const live = liveExportSchema.parse(
    JSON.parse(readFileSync(join(ACME, "..", "live-export.json"), "utf8")),
  );
  const added = takeInEvents(store, live.events);
  assert.equal(added.length, live.events.length);
  assert.deepEqual(
    added.map((one) => [
      one.id,
      one.type,
      one.persona,
      one.already?.id ?? null,
    ]),
    [
      ["S-0004", "bug", "mia", "X-1"],
      ["S-0005", "request", "bruno", "X-2"],
      ["S-0006", "request", "bruno", null],
      ["S-0007", "bug", null, "#41"],
      ["S-0008", "bug", null, null],
      ["S-0009", "feedback", "noah", null],
      ["S-0010", "bug", null, null],
      ["S-0011", "request", "mia", "X-1"],
    ],
  );
  assert.deepEqual(added[3]?.already, {
    kind: "work",
    id: "#41",
    title: "The order confirmation email failed to send",
  });
  // The same events again: nothing new.
  assert.deepEqual(takeInEvents(store, live.events), []);
  assert.equal(store.all("signals").length, live.events.length + 3);
});

test("the check reads Kobble's files and finds what is not there", () => {
  const factory = acmeFactory();
  assert.deepEqual(checkKobbleIn(factory).problems, []);
  const store = new KobbleStore(factory);
  store.put("signals", signal("S-0002", { persona: "zoe" }));
  const exploration = store.get("explorations", "X-1");
  assert.ok(exploration);
  store.put("explorations", { ...exploration, signals: ["S-0404"] });
  const { checked, problems } = checkKobbleIn(factory);
  assert.ok(checked);
  assert.equal(problems.length, 2);
  assert.match(
    problems[0] ?? "",
    /signals\/S-0002.json: there is no persona “zoe”/,
  );
  assert.match(
    problems[1] ?? "",
    /X-1\/exploration.json: there is no signal “S-0404”/,
  );
  // A persona's file that does not fit: said once, and what names
  // personas is not checked against the rest.
  writeFileSync(join(store.root, "personas", "bad.json"), "[]");
  const broken = checkKobbleIn(factory).problems;
  assert.equal(broken.length, 2);
  assert.match(broken[0] ?? "", /^kobble\/personas\/bad.json does not fit/);
  assert.equal(
    checkKobbleIn(mkdtempSync(join(tmpdir(), "none-"))).checked,
    false,
  );
});

test("a persona's face is its own, or always the same one from its id", () => {
  assert.deepEqual(faceFor("mia"), faceFor("mia"));
  const faces = new Set(
    ["mia", "bruno", "noah", "ines", "zoe", "office-manager"].map((id) =>
      JSON.stringify(faceFor(id)),
    ),
  );
  assert.ok(faces.size > 2);
  for (const id of ["a", "b", "c", "d", "e"]) {
    const face = faceFor(id);
    assert.ok(PERSONA_HATS.includes(face.hat));
    assert.ok(PERSONA_COLORS.includes(face.color));
  }
  const own = { hat: "toque" as const, color: "slate" as const };
  assert.deepEqual(faceOf({ id: "mia", face: own }), own);
  assert.deepEqual(faceOf({ id: "mia" }), faceFor("mia"));
  const store = emptyFactory();
  const persona = {
    id: "mia",
    name: "Mia",
    place: "",
    about: "",
    origin: "developer" as const,
    customers: [],
  };
  store.put("personas", { ...persona, face: own });
  assert.deepEqual(store.get("personas", "mia")?.face, own);
  assert.match(
    refusal(() =>
      store.put("personas", {
        ...persona,
        face: { hat: "flop" as "cap", color: "blue" },
      }),
    ),
    /hat/,
  );
});

test("a board in the first shape is read as things and arrows; arrows must join things", () => {
  const factory = acmeFactory();
  const store = new KobbleStore(factory);
  writeFileSync(
    join(store.root, "explorations", "X-2", "board.json"),
    JSON.stringify({
      question: "How?",
      options: [{ key: "A", name: "One way", difference: "x" }],
      prototypes: [
        {
          key: "A",
          name: "One way",
          difference: "x",
          branch: "proto/X-2-a",
          agreed: true,
          tests: [],
        },
      ],
      notes: ["Keep it short"],
    }),
  );
  const board = store.board("X-2");
  assert.deepEqual(
    board.things.map((t) => [t.id, t.kind, t.agreed]),
    [
      ["problem", "problem", false],
      ["choice", "choice", false],
      ["proto-a", "prototype", true],
      ["note-1", "note", false],
    ],
  );
  assert.deepEqual(
    board.links.map((l) => [l.from, l.to, l.label]),
    [
      ["problem", "choice", ""],
      ["choice", "proto-a", "A"],
    ],
  );
  store.saveBoard("X-2", {
    things: [],
    links: [{ id: "l", from: "problem", to: "gone", label: "" }],
  });
  assert.match(
    checkKobbleIn(factory).problems.join("\n"),
    /X-2\/board.json: the arrow l joins a thing that is not there/,
  );
  assert.equal(store.pictureFile("X-2", "../x.png"), null);
  store.savePicture("X-2", "a.png", new Uint8Array([1]));
  assert.ok(store.pictureFile("X-2", "a.png"));
});
