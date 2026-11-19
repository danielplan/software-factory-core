import assert from "node:assert/strict";
import { test } from "node:test";

import { chosenLocale, isChoice, LOCALES } from "../src/i18n/locale.ts";
import { messagesIn } from "../src/i18n/messages.ts";
import {
  problemTitle,
  updateReason,
  updateStep,
} from "../src/i18n/server-texts.ts";

// Every key a value has, with what kind of value it is ("text",
// "function"), so two languages can be compared.
function shapeOf(value: unknown, path = ""): string[] {
  if (typeof value === "string") return [`${path}: text`];
  if (typeof value === "function") return [`${path}: function`];
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, inner]) => shapeOf(inner, path ? `${path}.${key}` : key))
    .sort((a, b) => a.localeCompare(b));
}

test("every language has every key English has, of the same kind, and no empty text", () => {
  const english = shapeOf(messagesIn("en"));
  for (const locale of LOCALES) {
    assert.deepEqual(shapeOf(messagesIn(locale)), english, locale);
    const texts = JSON.stringify(messagesIn(locale));
    assert.doesNotMatch(texts, /:""/, `${locale} has an empty text`);
  }
});

// Every function in a language, with where it is.
function functionsOf(
  value: unknown,
  path = "",
): [string, (...args: unknown[]) => unknown][] {
  if (typeof value === "function")
    return [[path, value as (...args: unknown[]) => unknown]];
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    functionsOf(inner, path ? `${path}.${key}` : key),
  );
}

test("every word made from a name or a number gives a text, in every language, for one and for many", () => {
  for (const locale of LOCALES)
    for (const [path, make] of functionsOf(messagesIn(locale))) {
      const names = Array.from({ length: make.length }, () => "2");
      const said = make(...names);
      assert.equal(typeof said, "string", `${locale} ${path}`);
      assert.notEqual(said, "", `${locale} ${path}`);
      const one = Array.from({ length: make.length }, () => 1);
      try {
        make(...one);
      } catch {
        // A function that takes a name, not a number.
      }
    }
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
    problemTitle("Address 4176 is used by another program", it.system.problems),
    "L'indirizzo 4176 è usato da un altro programma",
  );
  assert.equal(
    problemTitle("Shop did not answer within 180 seconds", it.system.problems),
    "Shop non ha risposto entro 180 secondi",
  );
  assert.equal(
    problemTitle("Something new and unknown", it.system.problems),
    "Something new and unknown",
  );
  assert.equal(
    updateStep("Starting the products again", it.updates),
    "Riavvio i prodotti",
  );
  assert.equal(
    updateStep("Doing something else", it.updates),
    "Doing something else",
  );
  assert.equal(
    updateReason(
      'this folder is on the branch "trying", not on main',
      it.updates,
    ),
    'questa cartella è sul ramo "trying", non su main',
  );
  assert.equal(
    updateReason(
      "2 file(s) in this folder were changed by hand and are not saved in git",
      messagesIn("de").updates,
    ),
    "2 Datei(en) in diesem Ordner von Hand geändert und nicht in git gespeichert sind",
  );
  assert.equal(
    updateReason("an unknown reason", it.updates),
    "an unknown reason",
  );
});
