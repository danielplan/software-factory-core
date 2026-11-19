import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { answerIn, languageChoice } from "@software-factory/core";

import { inLanguage, languageRoutes } from "../src/language.ts";

const made: string[] = [];
after(() => {
  for (const folder of made) rmSync(folder, { recursive: true, force: true });
});

const url = new URL("http://localhost/");

function routesIn(withFactory: boolean) {
  const project = mkdtempSync(join(tmpdir(), "language-"));
  made.push(project);
  if (withFactory) mkdirSync(join(project, "factory"));
  const routes = languageRoutes(project);
  const route = (name: string) => {
    const found = routes[name];
    assert.ok(found, name);
    return found;
  };
  return { project, route };
}

test("the choice is kept per computer in the factory's personal settings, the browser's by default", async () => {
  const { project, route } = routesIn(true);
  assert.deepEqual(await route("GET /api/language")({}, url), {
    choice: "browser",
  });
  await route("POST /api/language")({ choice: "it" }, url);
  assert.equal(languageChoice(join(project, "factory")), "it");
  assert.deepEqual(await route("GET /api/language")({}, url), { choice: "it" });
  assert.throws(() => route("POST /api/language")({ choice: "fr" }, url), {
    message: /not a language/,
  });
});

test("before there is a factory, the browser's language is used and nothing is kept", async () => {
  const { route } = routesIn(false);
  await route("POST /api/language")({ choice: "de" }, url);
  assert.deepEqual(await route("GET /api/language")({}, url), {
    choice: "browser",
  });
});

test("the kobolds answer in the language the dashboard shows", async () => {
  const { route } = routesIn(false);
  await route("POST /api/language")({ spoken: "de" }, url);
  assert.match(inLanguage("Be kind."), /^Be kind\.\n\n## Language\n/);
  assert.match(inLanguage("Be kind."), /German \(Deutsch\)/);
  await route("POST /api/language")({ spoken: "xx" }, url);
  assert.match(inLanguage("Be kind."), /German/);
  await route("POST /api/language")({ spoken: "en" }, url);
  assert.equal(inLanguage("Be kind."), "Be kind.");
  assert.equal(answerIn("en"), "");
  assert.match(answerIn("it"), /Italian \(italiano\)/);
});
