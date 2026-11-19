import { expect, test } from "vitest";
import { clientErrorCodes } from "../src/api/api-error.ts";
import { languages } from "../src/i18n/i18n.ts";
import { resources } from "../src/i18n/resources.ts";

// The translations are complete: every language has every text and every
// error code the app knows, and a text uses the same values in every
// language. A new language passes these tests before it ships. When the app
// talks to a backend with error codes of its own, check those here too.

type Texts = { readonly [key: string]: string | Texts };

const plural = /_(zero|one|two|few|many|other)$/;
const sorted = (values: Iterable<string>) =>
  [...values].sort((left, right) => left.localeCompare(right));

// Every text of a language as "namespace:dotted.key" → text.
function flatten(texts: Texts, prefix: string): [string, string][] {
  return Object.entries(texts).flatMap(([key, value]) =>
    typeof value === "string"
      ? [[`${prefix}${key}`, value] as [string, string]]
      : flatten(value, `${prefix}${key}.`),
  );
}
const textsOf = (language: (typeof languages)[number]) =>
  new Map(
    Object.entries(resources[language]).flatMap(([namespace, texts]) =>
      flatten(texts as Texts, `${namespace}:`),
    ),
  );
const placeholders = (text: string) =>
  sorted(
    [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] ?? ""),
  );

test.each(languages)("%s translates every client error code", (language) => {
  expect(sorted(Object.keys(resources[language].errors))).toEqual(
    sorted(clientErrorCodes),
  );
});

test("every language has exactly the same texts", () => {
  const [first, ...others] = languages.map((language) => {
    const keys = [...textsOf(language).keys()];
    return new Set(keys.map((key) => key.replace(plural, "")));
  });
  for (const keys of others) expect(sorted(keys)).toEqual(sorted(first ?? []));
});

test.each(languages)(
  "%s has every plural form its grammar needs",
  (language) => {
    const keys = [...textsOf(language).keys()];
    const forms = new Intl.PluralRules(language).resolvedOptions()
      .pluralCategories;
    const counted = new Set(
      keys
        .filter((key) => plural.test(key))
        .map((key) => key.replace(plural, "")),
    );
    const missing = [...counted].flatMap((key) =>
      forms
        .filter((form) => !keys.includes(`${key}_${form}`))
        .map((form) => `${key}_${form}`),
    );
    expect(missing).toEqual([]);
  },
);

test("a text uses the same values in every language, and none is empty", () => {
  const english = textsOf("en");
  for (const language of languages) {
    for (const [key, text] of textsOf(language)) {
      expect(text.trim(), key).not.toBe("");
      const base = key.replace(plural, "");
      const source =
        english.get(key) ?? english.get(`${base}_other`) ?? english.get(base);
      expect(placeholders(text), `${language} ${key}`).toEqual(
        placeholders(source ?? ""),
      );
    }
  }
});
