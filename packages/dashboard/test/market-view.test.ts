import assert from "node:assert/strict";
import { test } from "node:test";

import type { AddOnView, KitView, ProductView } from "../src/api.ts";
import { messagesIn } from "../src/i18n/messages.ts";
import {
  alwaysLine,
  boardAction,
  boardThing,
  codeThing,
  extensionThing,
  installPlan,
  kitThing,
  matching,
  neededBy,
  pagesLeftOut,
  refusal,
  removing,
} from "../src/lib/market-view.ts";

const words = messagesIn("en").market;
const shell = messagesIn("en").shell;
const list = (items: string[]) => items.join(" and ");

const none = { pages: [], blocks: [], kobolds: [], stages: [] };
const addOn = (id: string, more: Partial<AddOnView> = {}): AddOnView => ({
  id,
  name: id,
  about: `${id} line`,
  builtIn: true,
  on: true,
  tracker: false,
  always: false,
  needs: [],
  slots: [],
  brings: none,
  settings: [],
  ...more,
});

const factory = addOn("factory", {
  always: true,
  slots: ["code", "tasks"],
  brings: {
    pages: ["build"],
    blocks: ["status", "reviews"],
    kobolds: ["builder"],
    stages: ["build"],
  },
});
const signals = addOn("signals", {
  brings: { ...none, pages: ["signals"], blocks: ["signals"] },
});
const personas = addOn("personas", {
  needs: ["signals"],
  brings: { ...none, pages: ["personas"], kobolds: ["tester"] },
});
const releases = addOn("releases", {
  needs: ["factory"],
  slots: ["code"],
  brings: { ...none, pages: ["releases"] },
});
const github = addOn("github", { tracker: true, on: true });
const jira = addOn("jira", { tracker: true, on: false });
const mine = addOn("standup", {
  builtIn: false,
  name: "Daily standup",
  about: "A page each morning.",
  on: false,
});
const all = [factory, signals, personas, releases, github, jira, mine];
const without = (id: string) =>
  all.map((one) => (one.id === id ? { ...one, on: false } : one));

test("an extension is named by the catalogue; one it does not know shows its own name", () => {
  assert.equal(extensionThing(words, shell, all, signals).name, "Signals");
  const own = extensionThing(words, shell, all, mine);
  assert.equal(own.name, "Daily standup");
  assert.equal(own.about, "A page each morning.");
  assert.equal(own.maker, "team");
  assert.equal(own.state, null);
  assert.equal(extensionThing(words, shell, all, factory).maker, "kobble");
  // A made-up id such as "constructor" is not found in the catalogue.
  assert.equal(
    extensionThing(words, shell, all, addOn("constructor")).name,
    "constructor",
  );
});

test("the extensions leave the boards out, and the filters and search narrow them", () => {
  const ids = (found: AddOnView[]) => found.map((one) => one.id);
  assert.deepEqual(ids(matching(all, words, "all", "")), [
    "factory",
    "signals",
    "personas",
    "releases",
    "standup",
  ]);
  assert.deepEqual(ids(matching(all, words, "installed", "")), [
    "factory",
    "signals",
    "personas",
    "releases",
  ]);
  assert.deepEqual(ids(matching(all, words, "team", "")), ["standup"]);
  assert.deepEqual(ids(matching(all, words, "kobble", "made-up")), [
    "personas",
  ]);
  assert.deepEqual(ids(matching(all, words, "all", "  MADE-UP customers ")), [
    "personas",
  ]);
  assert.deepEqual(ids(matching(all, words, "kobble", "morning")), []);
});

test("installing brings what it needs, the ones it needs first", () => {
  const bare = [factory, { ...signals, on: false }, { ...personas, on: false }];
  assert.deepEqual(
    installPlan(bare, "personas").map((one) => one.id),
    ["signals", "personas"],
  );
  assert.deepEqual(
    installPlan(all, "standup").map((one) => one.id),
    ["standup"],
  );
  assert.deepEqual(installPlan(all, "signals"), []);
});

test("one that others need cannot go, and the line says why", () => {
  assert.deepEqual(
    neededBy(all, "signals").map((one) => one.id),
    ["personas"],
  );
  assert.equal(
    refusal(words, all, signals, list),
    "Personas needs Signals. Remove it first.",
  );
  assert.equal(
    refusal(words, all, factory, list),
    "Releases needs Factory. Remove it first.",
  );
  assert.equal(
    refusal(
      words,
      [factory, signals, releases, personas, releases],
      factory,
      list,
    ),
    "Releases and Releases need Factory. Remove them first.",
  );
  assert.equal(refusal(words, all, personas, list), null);
  assert.equal(
    alwaysLine(words, "factory"),
    "Always needed: it builds everything",
  );
  assert.equal(alwaysLine(words, "anything"), "Always needed");
});

test("removing says what goes and what stays", () => {
  assert.deepEqual(removing(words, personas, list), [
    "Goes: its page and its kobold.",
    "Stays in the factory's files: its personas and their missions.",
  ]);
  assert.deepEqual(removing(words, mine, list), [
    "Stays in the factory's files: what it made.",
  ]);
});

test("what an extension brings and needs, by name", () => {
  const thing = extensionThing(words, shell, all, factory);
  assert.deepEqual(thing.brings, [
    { label: "Page", names: ["Factory"] },
    { label: "Home blocks", names: ["Product status", "Open reviews"] },
    { label: "Stage", names: ["Factory"] },
    { label: "Kobold", names: ["Bolt"] },
  ]);
  assert.deepEqual(thing.needs, [
    { label: "Your code", to: "connections" },
    { label: "Your tasks", to: "connections" },
  ]);
  assert.deepEqual(
    thing.neededBy?.map((one) => one.label),
    ["Releases"],
  );
  const found = extensionThing(words, shell, all, personas);
  assert.deepEqual(found.needs, [
    { label: "Signals", to: "extension:signals" },
  ]);
  assert.deepEqual(extensionThing(words, shell, all, releases).settings, []);
});

test("an extension's settings show while it is installed", () => {
  const set = addOn("jiraish", { settings: ["jira"] });
  assert.deepEqual(extensionThing(words, shell, [set], set).settings, ["jira"]);
  const off = { ...set, on: false };
  assert.deepEqual(extensionThing(words, shell, [off], off).settings, []);
});

test("the pages of extensions that are removed leave the sidebar", () => {
  assert.deepEqual(pagesLeftOut(all), []);
  assert.deepEqual(pagesLeftOut(without("personas")), ["personas"]);
  // Two extensions may bring one page: it stays while one is installed.
  const twin = addOn("twin", { brings: { ...none, pages: ["personas"] } });
  assert.deepEqual(pagesLeftOut([...without("personas"), twin]), []);
});

test("the connections: GitHub for the code, the boards for the tasks", () => {
  const code = codeThing(words, all);
  assert.equal(code.state, "inUse");
  assert.equal(code.name, "GitHub");
  assert.deepEqual(
    code.usedBy && "links" in code.usedBy
      ? code.usedBy.links.map((one) => one.label)
      : null,
    ["Factory", "Releases"],
  );
  const boards = [github, jira];
  assert.equal(boardThing(words, all, github, "github").state, "inUse");
  assert.equal(boardThing(words, all, jira, "github").state, null);
  assert.equal(boardThing(words, all, jira, "github").name, "Jira Cloud");
  assert.deepEqual(boardAction(boards, github, "github"), { kind: "none" });
  assert.deepEqual(boardAction(boards, jira, "github"), {
    kind: "switch",
    from: github,
    to: jira,
  });
  // Nothing connected: both say Connect.
  assert.deepEqual(boardAction(boards, jira, "none"), { kind: "connect" });
  assert.deepEqual(boardAction(boards, github, "none"), { kind: "connect" });
});

test("a kit is pre-installed and shows the products that use it", () => {
  const kit: KitView = {
    id: "react-web-app",
    name: "React web app",
    about: "How a React web app is built.",
    kind: "react-web-app",
    canCreate: true,
    madeBy: "kobble",
    brings: ["rules", "checks"],
  };
  const product = (name: string, kitId: string) =>
    ({ id: name, name, kit: kitId }) as ProductView;
  const thing = kitThing(words, kit, [
    product("Shop", "react-web-app"),
    product("App", "expo-app"),
  ]);
  assert.equal(thing.state, "preinstalled");
  assert.deepEqual(thing.brings[0]?.names, ["Rules", "Checks"]);
  assert.deepEqual(thing.usedBy, { kind: "products", names: ["Shop"] });
  assert.equal(kitThing(words, { ...kit, madeBy: "team" }, []).maker, "team");
});
