import assert from "node:assert/strict";
import { test } from "node:test";

import { resources } from "../src/i18n/i18n.ts";
import { languageOf } from "../src/lib/language-choice.ts";

// Every language says everything English says, and nothing is left empty.

const keysOf = (value: unknown, at = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([key, inner]) =>
        keysOf(inner, at ? `${at}.${key}` : key),
      )
    : [at];

const emptyIn = (value: unknown, at = ""): string[] => {
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, inner]) =>
      emptyIn(inner, at ? `${at}.${key}` : key),
    );
  return typeof value === "string" && value.trim() === "" ? [at] : [];
};

const sorted = (keys: string[]) => keys.toSorted((a, b) => a.localeCompare(b));

test("every language has the same words as English, none empty", () => {
  const english = sorted(keysOf(resources.en));
  for (const [language, words] of Object.entries(resources)) {
    assert.deepEqual(sorted(keysOf(words)), english, `${language} differs`);
    assert.deepEqual(emptyIn(words), [], `${language} has empty words`);
  }
});

test("the language: the kept choice, else the browser's, else English", () => {
  assert.equal(languageOf("de", ["it-IT"]), "de");
  assert.equal(languageOf(null, ["pt-BR", "fr-CA", "it"]), "fr");
  assert.equal(languageOf("klingon", ["ES"]), "es");
  assert.equal(languageOf(null, ["ja"]), "en");
});
