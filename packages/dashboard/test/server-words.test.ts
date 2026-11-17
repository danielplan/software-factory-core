import assert from "node:assert/strict";
import { test } from "node:test";

import { modelSettings } from "../../core/src/agents/model-setting.ts";
import { allKits } from "../../kits/src/index.ts";
import { takenByAnotherCopy } from "../../launcher/src/start-part.ts";
import { githubAddOn } from "../../server/src/add-ons/github/index.ts";
import { jiraAddOn } from "../../server/src/add-ons/jira/index.ts";
import { resources } from "../src/i18n/i18n.ts";
import {
  addOnWords,
  fieldWords,
  groupWords,
  kitWords,
} from "../src/lib/server-words.ts";
import { plainProblem, withoutFolders } from "../src/product/plain-problem.ts";

// What the server says in English about what comes with the core, in the
// dashboard's words: the same in English, so a change on either side shows
// here; and what the dashboard does not know keeps the server's words.

const known = resources.en.settings.known;

test("every kit, add-on and the AI model setting have the server's own words in English", () => {
  for (const kit of allKits) {
    const words = kitWords(kit);
    assert.deepEqual([words.name, words.about], [kit.name, kit.about], kit.id);
  }
  for (const addOn of [githubAddOn().extension, jiraAddOn().extension]) {
    const words = addOnWords(addOn);
    assert.deepEqual([words.name, words.about], [addOn.name, addOn.about]);
  }
  const group = groupWords(modelSettings);
  assert.deepEqual(
    [group.name, group.about],
    [modelSettings.name, modelSettings.about],
  );
  const [field] = modelSettings.fields;
  assert.ok(field);
  const said = fieldWords({ ...field, help: field.help });
  assert.deepEqual([said.label, said.help], [field.label, field.help]);
  assert.equal(Object.keys(known.kits).length, allKits.length);
});

test("an extension's own kit, add-on or setting keeps the server's words", () => {
  const theirs = { id: "their-kit", name: "Their kit", about: "Theirs." };
  assert.equal(kitWords(theirs), theirs);
  assert.equal(addOnWords(theirs), theirs);
  assert.equal(groupWords(theirs), theirs);
  const field = { key: "THEIR_KEY", label: "Theirs", help: "Theirs." };
  assert.equal(fieldWords(field), field);
});

test("a problem the factory knows is said again, its folder behind the details", () => {
  const problem = {
    ...takenByAnotherCopy(
      { name: "web" } as Parameters<typeof takenByAnotherCopy>[0],
      3001,
      "/Users/me/copy/apps/web",
    ),
    details: ["log line"],
  };
  assert.deepEqual(plainProblem(problem), {
    title: "Address 3001 is taken by a program from another folder",
    text: "web needs it, but another program uses it (perhaps another copy of this project). Stop that one, then press Try again.",
    details: ["/Users/me/copy/apps/web", "log line"],
  });
  assert.deepEqual(
    plainProblem({
      title: "Address 3001 is used by another program",
      text: "web needs it. Close the other program (perhaps an older window), then press Try again.",
      details: [],
    }).title,
    "Address 3001 is taken by another program",
  );
});

test("a problem it doesn't know keeps its words, its folders said as another folder", () => {
  assert.deepEqual(
    withoutFolders("It runs in (/Users/me/shop/api), not ~/x or C:\\a\\b."),
    {
      words: "It runs in (another folder), not ~/x or another folder.",
      folders: ["/Users/me/shop/api", "C:\\a\\b"],
    },
  );
  const odd = {
    title: "Address x is used by another program",
    text: "Hm.",
    details: [],
  };
  assert.deepEqual(plainProblem(odd), odd);
  assert.deepEqual(withoutFolders("Plain words / no folder."), {
    words: "Plain words / no folder.",
    folders: [],
  });
});
