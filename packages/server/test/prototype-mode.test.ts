import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  type Claude,
  readSeed,
  RecordStore,
  SEED_FILE,
} from "@software-factory/core";

import {
  makePrompt,
  makeVersion,
  nextKey,
  shortName,
} from "../src/prototypes/maker.ts";
import { PrototypeMode, type RunState } from "../src/prototypes/mode.ts";
import { urlIn, versionCopy } from "../src/prototypes/copies.ts";
import { git, inGit } from "./git-project.ts";

// Prototype mode: each version of an idea runs in its own copy of the code,
// started with the project's own start command, which says where it runs
// with a line FACTORY_URL=<address>; and the kobold makes new versions on
// their own branches. The commands are small shell lines, git is real (in
// a folder of the test's own) and Claude Code is a stand-in.

const ACME_SEED = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "acme",
  "factory",
  SEED_FILE,
);

function modeWith(prototype?: object) {
  const parent = mkdtempSync(join(tmpdir(), "mode-"));
  const project = join(parent, "shop");
  mkdirSync(join(project, "factory"), { recursive: true });
  writeFileSync(
    join(project, "factory", "factory.json"),
    JSON.stringify({ name: "Shop", prototype }),
  );
  inGit(project);
  const store = RecordStore.open(":memory:");
  store.fill(readSeed(ACME_SEED));
  let changes = 0;
  const mode = new PrototypeMode({
    project,
    root: join(project, "factory"),
    records: () => store,
    onChange: () => {
      changes++;
    },
  });
  return { parent, project, store, mode, changes: () => changes };
}

// Waits until the version is in one of these states.
async function until(mode: PrototypeMode, key: string, ...states: RunState[]) {
  for (let tries = 0; tries < 1000; tries++) {
    const run = mode.runOf("wish", key);
    if (states.includes(run.state)) return run;
    await new Promise((done) => setTimeout(done, 10));
  }
  throw new Error(`Version ${key} stayed ${mode.runOf("wish", key).state}.`);
}

test("a version starts in its own copy on its branch, and runs where its start command says", async () => {
  const { parent, project, mode, changes } = modeWith({
    start:
      'echo "starting $FACTORY_IDEA $FACTORY_VERSION" && echo "FACTORY_URL=http://127.0.0.1:5999/$FACTORY_VERSION"',
  });
  try {
    const started = await mode.start("wish", "B");
    assert.ok(["starting", "running"].includes(started.state));
    const run = await until(mode, "B", "running");
    assert.equal(run.url, "http://127.0.0.1:5999/B");
    assert.equal(run.problem, null);
    const copy = join(parent, "shop-prototypes", "wish", "b");
    assert.equal(
      git(copy, "branch", "--show-current").trim(),
      "factory/wish/b",
    );
    // The owner's own folder and branch were not touched.
    assert.equal(git(project, "branch", "--show-current").trim(), "main");
    assert.ok(changes() > 0);
    // Trying it again while it runs leaves it as it is.
    assert.equal((await mode.start("wish", "B")).url, run.url);
    assert.deepEqual(
      mode.view("wish").map((r) => r.version),
      ["B"],
    );
    assert.equal(mode.view("monday").length, 0);
  } finally {
    mode.close();
  }
});

test("a start command that keeps running is stopped with the version, and the stop command runs", async () => {
  const { parent, mode } = modeWith({
    start: "echo FACTORY_URL=http://localhost:5301 && sleep 30",
    stop: 'echo "$FACTORY_VERSION" > "$FACTORY_PROJECT/../stopped.txt"',
  });
  await mode.start("wish", "A");
  await until(mode, "A", "running");
  await mode.stop("wish", "A");
  assert.equal(mode.runOf("wish", "A").state, "stopped");
  assert.equal(mode.runOf("wish", "A").url, null);
  assert.equal(readFileSync(join(parent, "stopped.txt"), "utf8").trim(), "A");
});

test("a start command that fails says why, and one that does not say where says so", async () => {
  const failing = modeWith({ start: "echo 'the port is taken' && exit 3" });
  await failing.mode.start("wish", "A");
  const failed = await until(failing.mode, "A", "failed");
  assert.equal(failed.problem, "It stopped: the port is taken");

  const quiet = modeWith({ start: "true", stop: "exit 2" });
  await quiet.mode.start("wish", "C");
  const running = await until(quiet.mode, "C", "running");
  assert.equal(running.url, null);
  assert.match(running.problem ?? "", /prints a line FACTORY_URL=<address>/);
  await quiet.mode.stop("wish", "C");
  assert.equal(quiet.mode.runOf("wish", "C").state, "failed");
  assert.equal(
    quiet.mode.runOf("wish", "C").problem,
    "It stopped without saying why.",
  );
});

test("without a start command, or for a version that is not there, it says so plainly", async () => {
  const { mode } = modeWith();
  await assert.rejects(mode.start("wish", "A"), /cannot run versions yet/);
  await assert.rejects(mode.start("wish", "Z"), /There is no version Z/);
  // Stopping a version that never ran, without a stop command, is fine.
  await mode.stop("wish", "A");
  assert.equal(mode.runOf("wish", "A").state, "stopped");
});

test("a copy that cannot be made is said, and the version cannot start", async () => {
  const { project, mode } = modeWith({ start: "true" });
  git(project, "remote", "remove", "origin");
  const run = await mode.start("wish", "A");
  assert.equal(run.state, "failed");
  assert.match(
    run.problem ?? "",
    /The copy of version A of “wish” could not be made/,
  );
});

test("the kobold makes another version on its own branch, in its own copy, and it is committed there", async () => {
  const { parent, project, store, mode } = modeWith({ start: "true" });
  const seen: Parameters<Claude["run"]>[0][] = [];
  const claude: Claude = {
    async run(options) {
      seen.push(options);
      writeFileSync(join(options.cwd, "saved.txt"), "Saved for later\n");
      options.onActivity("Editing saved.txt");
      return { ok: true, text: "Changed the basket." };
    },
  };
  const version = makeVersion(
    mode,
    claude,
    "wish",
    "keep things with a long press on the product",
  );
  assert.deepEqual(
    [
      version.key,
      version.branch,
      version.madeBy,
      version.sharedAt,
      version.surface,
    ],
    ["D", "factory/wish/d", ["kobold"], null, "phone"],
  );
  assert.equal(version.name, "Keep things with a long press…");
  assert.equal(mode.runOf("wish", "D").state, "making");
  assert.ok(store.get("versions", "wish/D"));
  await until(mode, "D", "stopped");
  const copy = join(parent, "shop-prototypes", "wish", "d");
  assert.equal(git(copy, "branch", "--show-current").trim(), "factory/wish/d");
  assert.match(
    git(copy, "log", "-1", "--format=%s"),
    /^Version D of the idea wish: /,
  );
  assert.equal(git(copy, "status", "--porcelain").trim(), "");
  assert.equal(existsSync(join(project, "saved.txt")), false);
  const [run] = seen;
  assert.equal(run?.readOnly, false);
  assert.equal(run.cwd, copy);
  assert.match(run.instructions ?? "", /## Making a version/);
  assert.match(run.prompt, /This version: keep things with a long press/);
  assert.match(run.prompt, /it breaks here/);
});

test("a version the kobold could not finish says why; nothing to make is refused", async () => {
  const { mode } = modeWith();
  const claude: Claude = {
    run: () =>
      Promise.resolve({ ok: false, text: "", error: "it ran out of time" }),
  };
  makeVersion(mode, claude, "remind", "a bell at nine");
  const failed = await (async () => {
    for (let tries = 0; tries < 1000; tries++) {
      const run = mode.runOf("remind", "A");
      if (run.state === "failed") return run;
      await new Promise((done) => setTimeout(done, 10));
    }
    return null;
  })();
  assert.match(
    failed?.problem ?? "",
    /it ran out of time\. What it did so far is on factory\/remind\/a\./,
  );
  assert.throws(
    () => makeVersion(mode, claude, "remind", "  "),
    /Say what the version should do/,
  );
  assert.throws(
    () => makeVersion(mode, claude, "nothing", "x"),
    /There is no idea “nothing”/,
  );
  await assert.rejects(mode.start("remind", "A"), /cannot run versions yet/);
});

test("a version still being made cannot start yet", async () => {
  const { mode } = modeWith({ start: "true" });
  mode.set("wish", "A", { state: "making" });
  await assert.rejects(mode.start("wish", "A"), /still making it/);
});

test("versions are named in a few words, with the next free letter", () => {
  assert.equal(nextKey([]), "A");
  assert.equal(nextKey(["A", "B", "B2"]), "C");
  const all = Array.from({ length: 26 }, (_, at) =>
    String.fromCharCode(65 + at),
  );
  assert.equal(nextKey(all), "V27");
  assert.equal(nextKey([...all, "V27"]), "V28");
  assert.equal(shortName("one tap"), "One tap");
  assert.equal(urlIn("  FACTORY_URL=https://x.test/a  "), "https://x.test/a");
  assert.equal(urlIn("Open http://x.test"), null);
  assert.throws(() => versionCopy("/p", "../up", "A"), /cannot name an idea/);
  assert.throws(
    () => versionCopy("/p", "wish", "a/b"),
    /cannot name a version/,
  );
  const records = readSeed(ACME_SEED);
  const pickup = records.versions.find((v) => v.idea === "pickup");
  assert.ok(pickup);
  // An idea for a persona alone: the story written from the idea.
  assert.match(makePrompt(records, pickup, "x"), /The story it is for: /);
});
