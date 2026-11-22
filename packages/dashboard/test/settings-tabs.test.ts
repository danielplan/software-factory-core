import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GROUP_TABS,
  SETTINGS_TABS,
  shownTab,
  tabHash,
  tabsOf,
} from "../src/lib/settings-tabs.ts";

test("Settings has six tabs, in order", () => {
  assert.deepEqual(SETTINGS_TABS, [
    "Connections",
    "Stages",
    "AI models",
    "Updates",
    "This computer",
    "Advanced",
  ]);
});

test("each tab has its own address", () => {
  assert.equal(tabHash("Connections"), "#settings/connections");
  assert.equal(tabHash("AI models"), "#settings/ai-models");
  assert.equal(tabHash("This computer"), "#settings/this-computer");
});

test("the sections go in their tabs, in the tabs' order; empty tabs are left out", () => {
  const tabs = tabsOf([
    { name: "Updates", tab: "Updates" },
    { name: "Where work is tracked", tab: "Connections" },
    { name: "The live app", tab: "Connections" },
    { name: "Builder", tab: "AI models" },
    { name: "Usage log", tab: "Advanced" },
  ]);
  assert.deepEqual(
    tabs.map((tab) => [tab.name, tab.sections.map((one) => one.name)]),
    [
      ["Connections", ["Where work is tracked", "The live app"]],
      ["AI models", ["Builder"]],
      ["Updates", ["Updates"]],
      ["Advanced", ["Usage log"]],
    ],
  );
});

test("the address opens its tab; no address or an unknown one opens the first", () => {
  const tabs = tabsOf([
    { name: "Where work is tracked", tab: "Connections" },
    { name: "This computer", tab: "This computer" },
  ]);
  assert.equal(shownTab(tabs, "this-computer")?.name, "This computer");
  assert.equal(shownTab(tabs, null)?.name, "Connections");
  assert.equal(shownTab(tabs, "advanced")?.name, "Connections");
  assert.equal(shownTab([], null), undefined);
});

test("the AI models and the builder's group have their own tab", () => {
  assert.equal(GROUP_TABS["ai-model"], "AI models");
  assert.equal(GROUP_TABS.builder, "AI models");
});
