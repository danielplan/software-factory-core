import { clientErrorCodes } from '@/api/api-error';
import { languages } from '@/i18n/i18n';
import { resources } from '@/i18n/resources';

// The translations are complete: every language has every text and every
// error code the app itself can give, and a text uses the same values in
// every language. A new language passes these tests before it ships. When
// the app calls a backend with its own error codes, translate the codes it
// can meet too.

type Texts = { readonly [key: string]: string | Texts };

const plural = /_(zero|one|two|few|many|other)$/;
const sorted = (values: Iterable<string>) =>
  [...values].sort((left, right) => left.localeCompare(right));

// Every text of a language as "namespace:dotted.key" → text.
function flatten(texts: Texts, prefix: string): [string, string][] {
  return Object.entries(texts).flatMap(([key, value]) =>
    typeof value === 'string'
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
    [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1] ?? ''),
  );

test.each(languages)('%s translates every client error code', (language) => {
  const translated = sorted(Object.keys(resources[language].errors));
  expect(translated).toEqual(sorted([...clientErrorCodes, 'unexpected']));
});

test('every language has exactly the same texts', () => {
  const [first, ...others] = languages.map((language) => {
    const keys = [...textsOf(language).keys()];
    return new Set(keys.map((key) => key.replace(plural, '')));
  });
  for (const keys of others) expect(sorted(keys)).toEqual(sorted(first ?? []));
});

test('a text uses the same values in every language, and none is empty', () => {
  const source = textsOf(languages[0]);
  for (const language of languages) {
    for (const [key, text] of textsOf(language)) {
      expect(text.trim()).not.toBe('');
      const base = key.replace(plural, '');
      const original =
        source.get(key) ?? source.get(`${base}_other`) ?? source.get(base);
      expect([key, placeholders(text)]).toEqual([
        key,
        placeholders(original ?? ''),
      ]);
    }
  }
});

test('no text shown to people talks about the backend or the connection to it', () => {
  for (const language of languages) {
    const technical = [...textsOf(language)].filter(([, text]) =>
      /backend|server locale|local server/i.test(text),
    );
    expect(technical).toEqual([]);
  }
});
