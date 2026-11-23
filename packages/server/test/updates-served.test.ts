import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { KeptRelease } from "@software-factory/core";

import {
  KobbleReleases,
  newerRelease,
  upgradeBody,
  upgradeTitle,
} from "../src/updates/kobble-release.ts";
import { afterUpdate, servedUpdates } from "../src/updates/served.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

function steps() {
  const said: string[] = [];
  const done: string[] = [];
  const options = {
    install: () => {
      done.push("install");
      return Promise.resolve();
    },
    newKobble: () => false,
    restartRunning: () => {
      done.push("products");
      return Promise.resolve();
    },
    restartFactory: () => {
      done.push("factory");
      return Promise.resolve();
    },
  };
  const say = (step: string) => said.push(step);
  return { said, done, options, say };
}

test("after an update without package changes, the running products start again", async () => {
  const { said, done, options, say } = steps();
  await afterUpdate(options)(["src/app.ts"], say);
  assert.deepEqual(done, ["products"]);
  assert.deepEqual(said, ["Starting the products again"]);
});

test("changed package files are installed; a new Kobble starts the factory again", async () => {
  const one = steps();
  await afterUpdate(one.options)(["web/package-lock.json"], one.say);
  assert.deepEqual(one.done, ["install", "products"]);
  const two = steps();
  await afterUpdate({ ...two.options, newKobble: () => true })(
    ["package.json"],
    two.say,
  );
  assert.deepEqual(two.done, ["install", "factory"]);
  assert.deepEqual(two.said, [
    "Installing what the changes need",
    "Starting the factory again on the new Kobble",
  ]);
  const three = steps();
  await afterUpdate({
    ...three.options,
    newKobble: () => true,
    restartFactory: undefined,
  })(["package.json"], three.say);
  assert.deepEqual(three.done, ["install", "products"]);
});

test("the newest release counts only when it is newer than this factory's", () => {
  const tags = [
    "abc\trefs/tags/release-0.9.0",
    "def\trefs/tags/release-0.12.0",
    "ghi\trefs/tags/release-0.11.1",
    "jkl\trefs/tags/v0.12.0",
    "",
  ];
  assert.equal(newerRelease(tags, "0.11.1"), "0.12.0");
  assert.equal(newerRelease(tags, "0.12.0"), null);
  assert.equal(newerRelease([], "0.11.1"), null);
  assert.equal(upgradeTitle("0.12.0"), "Upgrade Kobble to 0.12.0");
  assert.match(upgradeBody("0.11.1", "0.12.0"), /upgrade-factory skill/);
});

test("the releases are looked at, and the card on the board that prepares one is found", async () => {
  let tags = ["x\trefs/tags/release-0.12.0"];
  let changes = 0;
  const cards = [
    { number: 61, title: "Upgrade Kobble to 0.12.0", url: "u", closed: false },
  ];
  const releases = new KobbleReleases({
    current: "0.11.1",
    tags: () => Promise.resolve(tags),
    cards: () => cards,
    onChange: () => {
      changes += 1;
    },
  });
  assert.deepEqual(releases.view(), { newest: null, card: null });
  await releases.look();
  assert.deepEqual(releases.view(), {
    newest: "0.12.0",
    card: { number: 61, url: "u" },
  });
  await releases.look();
  assert.equal(changes, 1);
  tags = [];
  const stop = releases.follow(10);
  while (releases.view().newest !== null)
    await new Promise((resolve) => setTimeout(resolve, 10));
  stop();
  assert.equal(changes, 2);
});

test("the routes show the updates with the release, and prepare it once as a card", async () => {
  const project = mkdtempSync(join(tmpdir(), "updates-served-"));
  made.push(project);
  const created: string[] = [];
  const cards: {
    number: number;
    title: string;
    url: string;
    closed: boolean;
  }[] = [];
  const served = servedUpdates({
    project,
    restartRunning: () => Promise.resolve(),
    install: () => Promise.resolve(),
    newKobble: () => false,
    releases: {
      current: "0.11.1",
      tags: () => Promise.resolve(["x\trefs/tags/release-0.12.0"]),
      offline: () => [],
      online: () => Promise.resolve(null),
      cards: () => cards,
      create: (title) => {
        created.push(title);
        cards.push({ number: 61, title, url: "u", closed: false });
        return Promise.resolve();
      },
    },
    onChange: () => {},
    git: () => Promise.resolve({ ok: false, log: [] }),
  });
  const route = (name: string) => {
    const found = served.routes[name];
    assert.ok(found, name);
    return found;
  };
  const url = new URL("http://localhost/");
  await route("POST /api/updates/prepare-release")({}, url);
  assert.deepEqual(created, []);
  await route("POST /api/updates/look")({}, url);
  const view = (await route("GET /api/updates")({}, url)) as {
    release: unknown;
    offline: boolean;
  };
  assert.deepEqual(view.release, { newest: "0.12.0", card: null });
  assert.equal(view.offline, true);
  await route("POST /api/updates/prepare-release")({}, url);
  await route("POST /api/updates/prepare-release")({}, url);
  assert.deepEqual(created, ["Upgrade Kobble to 0.12.0"]);
  served.start();
  served.close();
});

const HERE: KeptRelease = {
  version: "0.11.1",
  date: null,
  notes: { en: [{ kind: "New", title: "Here.", text: "Now." }] },
};
const NEWER: KeptRelease[] = [
  {
    version: "0.12.0",
    date: "2026-11-22",
    notes: {
      en: [{ kind: "Fixed", title: "Gone.", text: "It works." }],
      it: [{ kind: "Fixed", title: "Sparito.", text: "Funziona." }],
    },
  },
  // Made on GitHub, not out as a package yet.
  {
    version: "0.13.0",
    date: null,
    notes: { en: [{ kind: "New", title: "Later.", text: "" }] },
  },
];

function whatsNewRoute(github: { up: boolean }) {
  const project = mkdtempSync(join(tmpdir(), "updates-served-"));
  made.push(project);
  let asked = 0;
  const served = servedUpdates({
    project,
    restartRunning: () => Promise.resolve(),
    install: () => Promise.resolve(),
    newKobble: () => false,
    releases: {
      current: "0.11.1",
      tags: () =>
        Promise.resolve(github.up ? ["x\trefs/tags/release-0.12.0"] : null),
      offline: () => [HERE],
      online: () => {
        asked += 1;
        return Promise.resolve(github.up ? NEWER : null);
      },
      cards: () => [],
      create: () => Promise.resolve(),
    },
    onChange: () => {},
    git: () => Promise.resolve({ ok: false, log: [] }),
  });
  const call = async (name: string, query = "") => {
    const found = served.routes[name];
    assert.ok(found, name);
    return (await found({}, new URL(`http://localhost/${query}`))) as {
      current: string;
      newest: {
        version: string;
        release: { changes: { title: string }[] } | null;
      } | null;
      offline: boolean;
      checkedAt: string | null;
      releases: { version: string }[];
    };
  };
  return { call, asked: () => asked };
}

test("what's new lists the local releases when GitHub fails", async () => {
  const { call, asked } = whatsNewRoute({ up: false });
  await call("POST /api/updates/look");
  const view = await call("GET /api/updates/whats-new", "?language=it");
  assert.equal(view.offline, true);
  assert.ok(view.checkedAt);
  assert.equal(view.newest, null);
  assert.equal(view.current, "0.11.1");
  assert.deepEqual(
    view.releases.map((one) => one.version),
    ["0.11.1"],
  );
  assert.equal(asked(), 0);
});

test("what's new adds the newer release from GitHub, in the language, once a look", async () => {
  const { call, asked } = whatsNewRoute({ up: true });
  await call("POST /api/updates/look");
  const view = await call("GET /api/updates/whats-new", "?language=it");
  assert.equal(view.offline, false);
  const { newest } = view;
  assert.ok(newest);
  assert.equal(newest.version, "0.12.0");
  assert.equal(newest.release?.changes.at(0)?.title, "Sparito.");
  assert.deepEqual(
    view.releases.map((one) => one.version),
    ["0.11.1"],
  );
  const german = await call("GET /api/updates/whats-new", "?language=de");
  assert.equal(german.newest?.release?.changes.at(0)?.title, "Gone.");
  assert.equal(asked(), 1);
  // The next look is at another time.
  await new Promise((done) => setTimeout(done, 5));
  await call("POST /api/updates/look");
  await call("GET /api/updates/whats-new", "?language=de");
  assert.equal(asked(), 2);
});
