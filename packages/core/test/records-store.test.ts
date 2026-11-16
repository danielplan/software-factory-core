import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import {
  checkRecordsIn,
  derive,
  openRecords,
  readSeed,
  RECORDS_FILE,
  type RecordsChange,
  RecordsRefused,
  RecordStore,
  SEED_FILE,
} from "../src/index.ts";
import { ACME } from "./stand-ins.ts";

// The records' store (a local SQLite database), what is worked out from the
// records, and the factory's records files: the database and its seed.

const SEED = readSeed(join(ACME, SEED_FILE));

function seeded(): RecordStore {
  const store = RecordStore.open(":memory:");
  store.fill(SEED);
  return store;
}

// The problems a refused write said.
function refusal(write: () => unknown): string[] {
  try {
    write();
  } catch (error) {
    assert.ok(error instanceof RecordsRefused, String(error));
    return error.problems;
  }
  assert.fail("The write was not refused.");
}

test("the store keeps records by kind and key, in the order they came", () => {
  const store = RecordStore.open(":memory:");
  assert.equal(store.isEmpty(), true);
  store.fill(SEED);
  assert.equal(store.isEmpty(), false);
  assert.deepEqual(store.all(), SEED);
  assert.deepEqual(
    store.list("personas").map((p) => p.name),
    ["Mia", "Bruno", "Noah", "Ines"],
  );
  assert.equal(
    store.get("versions", "monday/B2")?.name,
    "One tap, amounts editable",
  );
  assert.equal(store.get("outcomes", "127")?.worked, "yes");
  assert.equal(store.get("signals", "s404"), null);
  assert.deepEqual(store.check(), []);
  store.close();
  store.close();
});

test("a new record gets its defaults, and whoever listens hears which changed", () => {
  const store = seeded();
  const heard: RecordsChange[] = [];
  const stop = store.subscribe((change) => heard.push(change));
  const saved = store.put("signals", {
    id: "s19",
    source: "sup",
    text: "Can I pay by invoice?",
  });
  assert.deepEqual(saved, {
    id: "s19",
    source: "sup",
    text: "Can I pay by invoice?",
    who: null,
    when: "",
    sortedAs: "unsure",
    soundsLike: null,
    why: "",
    by: "kobold",
    wentTo: null,
  });
  // Changed again, it keeps its place.
  store.put("signals", { ...saved, why: "Sounds like a bakery." });
  assert.equal(store.list("signals").at(-1)?.why, "Sounds like a bakery.");
  stop();
  store.put("signals", { ...saved, id: "s20" });
  assert.deepEqual(heard, [
    [{ kind: "signals", keys: ["s19"] }],
    [{ kind: "signals", keys: ["s19"] }],
  ]);
  store.close();
});

test("a record that does not fit, or a write that breaks a rule, is refused and changes nothing", () => {
  const store = seeded();
  const [unfit] = refusal(() =>
    store.put("signals", { id: "s19", source: "sup", text: "" }),
  );
  assert.match(unfit ?? "", /^This signal does not fit: .*text/s);
  assert.deepEqual(
    refusal(() =>
      store.put("signals", { id: "s19", source: "letters", text: "Hello" }),
    ),
    ["Signal s19: its source “letters” is not there."],
  );
  assert.equal(store.get("signals", "s19"), null);
  // Removing what other records point to is refused too.
  assert.ok(
    refusal(() => {
      store.remove("personas", "ines");
    }).includes("Problem note: its persona “ines” is not there."),
  );
  assert.deepEqual(
    refusal(() => {
      store.remove("signals", "s404");
    }),
    ["There is no signal “s404”."],
  );
  assert.deepEqual(store.all(), SEED);
  store.close();
});

test("several changes are one write: a problem comes with the story that breaks at it", () => {
  const store = seeded();
  const problem = {
    id: "late",
    persona: "ines",
    title: "The gift arrives after the holidays",
    by: "kobold",
  };
  const said = {
    id: "s19",
    source: "rev",
    text: "“It came on the 27th.”",
    soundsLike: "ines",
    wentTo: { to: "problem" as const, id: "late" },
  };
  // On its own, a problem has no story and no signal behind it.
  assert.equal(refusal(() => store.put("problems", problem)).length, 2);
  const change = store.write((writer) => {
    writer.put("problems", problem);
    writer.put("signals", said);
    writer.put("stories", {
      id: "st11",
      persona: "ines",
      title: "A late gift",
      scenes: [
        { text: "Waits for the parcel", evidence: ["s19"], breaks: true },
      ],
      from: { signals: ["s19"] },
      problem: "late",
    });
  });
  assert.deepEqual(change, [
    { kind: "problems", keys: ["late"] },
    { kind: "signals", keys: ["s19"] },
    { kind: "stories", keys: ["st11"] },
  ]);
  assert.deepEqual(store.check(), []);
  // An outcome can go; what is worked out follows.
  store.remove("outcomes", "127");
  assert.equal(derive(store.all()).problems.slotsP, "beingSolved");
  store.close();
});

test("a problem the records had before does not stop other writes", () => {
  const file = join(mkdtempSync(join(tmpdir(), "records-")), RECORDS_FILE);
  const store = RecordStore.open(file);
  store.fill(SEED);
  // Changed by hand, past the store: Noah's real problem is gone.
  const db = new DatabaseSync(file);
  db.prepare(`DELETE FROM "realProblems" WHERE key = ?`).run("r_noah");
  db.close();
  assert.equal(store.check().length, 2);
  store.put("signals", { id: "s19", source: "sup", text: "Hello?" });
  assert.equal(store.get("signals", "s19")?.text, "Hello?");
  // A row that no longer fits is said, with its key.
  const again = new DatabaseSync(file);
  again
    .prepare(`UPDATE "personas" SET data = ? WHERE key = ?`)
    .run(JSON.stringify({ id: "mia" }), "mia");
  again.close();
  assert.match(
    refusal(() => store.get("personas", "mia"))[0] ?? "",
    /^The persona “mia” in the database does not fit/,
  );
  store.close();
});

test("where problems and ideas stand, and how well stories are known, are worked out", () => {
  const derived = derive(SEED);
  assert.deepEqual(derived.ideas, {
    wish: "exploring",
    remind: "exploring",
    tracking: "inBuild",
    monday: "inBuild",
    later: "worked",
    standing: "exploring",
    size: "inBuild",
    pickup: "didntWork",
  });
  assert.equal(derived.problems.slotsP, "solved");
  assert.equal(derived.problems.find, "beingSolved");
  assert.equal(derived.problems.invoice, "open");
  assert.deepEqual(derived.stories.st1, {
    known: { seen: 4, of: 5 },
    ended: false,
  });
  assert.deepEqual(derived.stories.st2, {
    known: { seen: 2, of: 3 },
    ended: true,
  });
  assert.deepEqual(derived.stories.st10?.known, { seen: 0, of: 4 });
  assert.deepEqual(derived.personas.mia, {
    stories: 2,
    openStories: 1,
    realProblems: ["r_mia"],
  });
  assert.deepEqual(derived.personas.ines?.realProblems, []);

  // "Didn't check" keeps the idea in Build; every "no" means it didn't work,
  // and its problem is open again when nothing else is tried for it.
  const records = structuredClone(SEED);
  records.outcomes.push({
    issue: 135,
    worked: "unchecked",
    seen: null,
    by: "Anna",
    on: "16 Nov",
  });
  assert.equal(derive(records).ideas.size, "inBuild");
  records.outcomes[2]!.worked = "no";
  const after = derive(records);
  assert.equal(after.ideas.size, "didntWork");
  assert.equal(after.problems.size, "open");
});

test("each problem is at a stage, from heard to solved, worked out and never stored", () => {
  assert.deepEqual(derive(SEED).stages, {
    find: "trying",
    invoice: "heard",
    when: "building",
    size: "building",
    amounts: "building",
    copy: "building",
    note: "heard",
    forget: "trying",
    slotsP: "solved",
  });
  // The board says which issues are closed or in the app.
  assert.equal(derive(SEED, new Set([138])).stages.when, "inApp");

  const records = structuredClone(SEED);
  // A problem assumed from an idea, with nothing tried for it yet.
  records.ideas.find((idea) => idea.id === "standing")!.problems = [];
  assert.equal(derive(records).stages.forget, "assumed");
  // "Didn't check" is in the app, waiting.
  records.outcomes.push({
    issue: 135,
    worked: "unchecked",
    seen: null,
    by: "Anna",
    on: "16 Nov",
  });
  assert.equal(derive(records).stages.size, "inApp");
  // "No", with nothing else under way: it didn't work.
  records.outcomes[2]!.worked = "no";
  assert.equal(derive(records).stages.size, "didntWork");
  // An idea that did not work, with no ticket for the problem.
  records.ideas.push({
    ...records.ideas.find((idea) => idea.id === "pickup")!,
    id: "pickup2",
    problems: ["invoice"],
  });
  records.ticketLinks.push({
    issue: 200,
    kind: "idea",
    from: { idea: "pickup2", version: "A" },
    problems: [],
    on: "",
  });
  records.outcomes.push({
    issue: 200,
    worked: "no",
    seen: null,
    by: "Anna",
    on: "16 Nov",
  });
  assert.equal(derive(records).ideas.pickup2, "didntWork");
  assert.equal(derive(records).stages.invoice, "didntWork");
  // Another idea explored for it: trying again.
  records.ideas.find((idea) => idea.id === "wish")!.problems.push("invoice");
  assert.equal(derive(records).stages.invoice, "trying");
});

test("each idea is at a stage, from its first version to worked, worked out and never stored", () => {
  assert.deepEqual(derive(SEED).ideaStages, {
    wish: "picked",
    remind: "idea",
    tracking: "building",
    monday: "building",
    later: "worked",
    standing: "idea",
    size: "building",
    pickup: "didntWork",
  });
  assert.equal(derive(SEED, new Set([138])).ideaStages.tracking, "inApp");
  const records = structuredClone(SEED);
  const wish = records.versions.filter((v) => v.idea === "wish");
  // Two versions with the most picks: versions, nobody leads.
  wish[0]!.picks = ["pia", "tobias"];
  assert.equal(derive(records).ideaStages.wish, "versions");
  // "Didn't check": in the app.
  records.outcomes.push({
    issue: 135,
    worked: "unchecked",
    seen: null,
    by: "Anna",
    on: "16 Nov",
  });
  assert.equal(derive(records).ideaStages.size, "inApp");
});

test("a factory's database is made beside its seed, filled from it once, and kept out of git", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-"));
  copyFileSync(join(ACME, SEED_FILE), join(root, SEED_FILE));
  writeFileSync(join(root, ".gitignore"), "copies/\nsettings/");
  const store = openRecords(root);
  assert.equal(store.list("stories").length, 10);
  store.remove("outcomes", "109");
  store.close();
  assert.equal(
    readFileSync(join(root, ".gitignore"), "utf8"),
    "copies/\nsettings/\nkobble.db*\n",
  );
  // Opened again: the records as they were left, the line not added twice.
  const again = openRecords(root);
  assert.equal(again.get("outcomes", "109"), null);
  again.close();
  assert.equal(
    readFileSync(join(root, ".gitignore"), "utf8"),
    "copies/\nsettings/\nkobble.db*\n",
  );
  // Without a seed, the database starts empty, with its own .gitignore.
  const empty = mkdtempSync(join(tmpdir(), "factory-"));
  const none = openRecords(empty);
  assert.equal(none.isEmpty(), true);
  none.close();
  assert.equal(readFileSync(join(empty, ".gitignore"), "utf8"), "kobble.db*\n");
});

test("a seed that does not fit is refused, with why", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-"));
  writeFileSync(join(root, SEED_FILE), "{ not json");
  assert.match(
    refusal(() => openRecords(root))[0] ?? "",
    /^kobble-seed\.json: it cannot be read: /,
  );
  writeFileSync(join(root, SEED_FILE), JSON.stringify({ people: [] }));
  assert.match(
    refusal(() => openRecords(root))[0] ?? "",
    /^kobble-seed\.json: it does not fit: /,
  );
  writeFileSync(
    join(root, SEED_FILE),
    JSON.stringify({
      customers: [{ id: "lisa", name: "Lisa", persona: "mia" }],
    }),
  );
  assert.deepEqual(
    refusal(() => openRecords(root)),
    ["kobble-seed.json: Customer lisa: its persona “mia” is not there."],
  );
});

test("the checks look at the database and the seed, where there are, and make nothing", () => {
  const root = mkdtempSync(join(tmpdir(), "factory-"));
  assert.deepEqual(checkRecordsIn(root), { checked: [], problems: [] });
  assert.equal(existsSync(join(root, RECORDS_FILE)), false);

  const seed = structuredClone(SEED);
  seed.stories[0]!.scenes[0]!.breaks = true;
  writeFileSync(join(root, SEED_FILE), JSON.stringify(seed));
  assert.deepEqual(checkRecordsIn(root), {
    checked: [SEED_FILE],
    problems: [
      "kobble-seed.json: Story st1: it breaks 2 times: a story breaks exactly once, unless it is marked wrong.",
    ],
  });

  // A database that is not the records'.
  new DatabaseSync(join(root, RECORDS_FILE)).close();
  const { checked, problems } = checkRecordsIn(root);
  assert.deepEqual(checked, [RECORDS_FILE, SEED_FILE]);
  assert.match(problems[0] ?? "", /^kobble\.db: .*no such table/);
});
