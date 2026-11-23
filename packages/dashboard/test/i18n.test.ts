import assert from "node:assert/strict";
import { test } from "node:test";

import { chosenLocale, isChoice, LOCALES } from "../src/i18n/locale.ts";
import { messagesIn } from "../src/i18n/messages.ts";
import { resources } from "../src/i18n/resources.ts";
import {
  handOffProblem,
  problemTitle,
  updateReason,
  updateStep,
} from "../src/i18n/server-texts.ts";

// The plural forms i18next adds to a key ("signals_one", "signals_many").
const PLURAL = /_(zero|one|two|few|many|other)$/;

// Every text in a language, by its whole key.
function textsOf(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value))
    return value.flatMap((one, at) => textsOf(one, `${path}.${String(at)}`));
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([key, inner]) => textsOf(inner, path ? `${path}.${key}` : key),
  );
}

// The keys, with a word's plural forms as one key.
const keysOf = (texts: [string, string][]) =>
  [...new Set(texts.map(([key]) => key.replace(PLURAL, "")))].sort((a, b) =>
    a.localeCompare(b),
  );

// The names a text is made with ("{{count}}", "{{name}}").
const namesIn = (text: string) =>
  [...text.matchAll(/\{\{\s*(\w+)/g)]
    .map((found) => found[1] ?? "")
    .sort((a, b) => a.localeCompare(b));

const english = textsOf(resources.en.translation);

test("every language has every key English has, and no empty text", () => {
  for (const locale of LOCALES) {
    const texts = textsOf(resources[locale].translation);
    assert.deepEqual(keysOf(texts), keysOf(english), locale);
    for (const [key, text] of texts)
      assert.notEqual(text.trim(), "", `${locale} ${key} is empty`);
  }
});

test("a word that counts has every plural form its language needs", () => {
  for (const locale of LOCALES) {
    const texts = new Map(textsOf(resources[locale].translation));
    const counted = new Set(
      [...texts.keys()]
        .filter((key) => PLURAL.test(key))
        .map((key) => key.replace(PLURAL, "")),
    );
    const forms = new Intl.PluralRules(locale).resolvedOptions()
      .pluralCategories;
    for (const key of counted)
      for (const form of forms)
        assert.ok(texts.has(`${key}_${form}`), `${locale} ${key}_${form}`);
  }
});

test("every language makes a word with the same names as English", () => {
  const names = new Map(
    english.map(([key, text]) => [key.replace(PLURAL, ""), namesIn(text)]),
  );
  for (const locale of LOCALES)
    for (const [key, text] of textsOf(resources[locale].translation)) {
      const want = (names.get(key.replace(PLURAL, "")) ?? []).filter(
        (name) => name !== "count",
      );
      const have = namesIn(text).filter((name) => name !== "count");
      assert.deepEqual(
        [...new Set(have)],
        [...new Set(want)],
        `${locale} ${key}`,
      );
    }
});

test("a word is made from its names and counts, in each language", () => {
  const it = messagesIn("it");
  assert.equal(it("home.newSignals", { count: 1 }), "1 nuovo segnale");
  assert.equal(it("home.newSignals", { count: 3 }), "3 nuovi segnali");
  assert.equal(
    it("home.newSignals", { count: 1_000_000 }),
    "1000000 nuovi segnali",
  );
  const en = messagesIn("en");
  assert.equal(
    en("releases.merged", { count: 3, last: "1.2.0", context: "since" }),
    "Merged since 1.2.0 (3)",
  );
  assert.equal(en("releases.merged", { count: 3 }), "Merged so far (3)");
  assert.equal(
    en("connect.pick.choose", { label: "Column" }),
    "Choose the column…",
  );
  assert.equal(
    messagesIn("de")("connect.pick.choose", { label: "Spalte" }),
    "Spalte wählen…",
  );
});

test("the language is the one chosen, or the browser's first one Kobble speaks, or English", () => {
  assert.equal(chosenLocale("de", ["it-IT"]), "de");
  assert.equal(chosenLocale("browser", ["fr-FR", "it-CH", "de"]), "it");
  assert.equal(chosenLocale("browser", ["de-AT"]), "de");
  assert.equal(chosenLocale("browser", ["fr", "es"]), "en");
  assert.equal(chosenLocale("browser", []), "en");
  assert.equal(isChoice("browser"), true);
  assert.equal(isChoice("fr"), false);
});

test("the server's words are said again in the language shown, with what they name", () => {
  const it = messagesIn("it");
  assert.equal(
    problemTitle("Address 4176 is used by another program", it),
    "L'indirizzo 4176 è usato da un altro programma",
  );
  assert.equal(
    problemTitle("Shop did not answer within 180 seconds", it),
    "Shop non ha risposto entro 180 secondi",
  );
  assert.equal(
    problemTitle("Something new and unknown", it),
    "Something new and unknown",
  );
  assert.match(
    handOffProblem(
      "Issue #12 was made, but it is not on the board after waiting for GitHub to add it. Add it to the board by hand, or hand off again: it carries on with that issue.",
      it,
    ),
    /^L'issue #12 è stata creata/,
  );
  assert.equal(handOffProblem("GitHub is down", it), "GitHub is down");
  assert.equal(
    updateStep("Starting the products again", it),
    "Riavvio i prodotti",
  );
  assert.equal(updateStep("Doing something else", it), "Doing something else");
  assert.equal(
    updateReason('this folder is on the branch "trying", not on main', it),
    'questa cartella è sul ramo "trying", non su main',
  );
  assert.equal(
    updateReason(
      "2 file(s) in this folder were changed by hand and are not saved in git",
      messagesIn("de"),
    ),
    "2 Datei(en) in diesem Ordner von Hand geändert und nicht in git gespeichert sind",
  );
  assert.equal(updateReason("an unknown reason", it), "an unknown reason");
});
