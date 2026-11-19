import enCommon from './locales/en/common.json';
import enErrors from './locales/en/errors.json';
import enHome from './locales/en/home.json';

// Every text of the app, one file per area and language
// (locales/<language>/<area>.json). A new area is one more file per language
// and one more entry here; a new language is one more folder, one more entry
// in `resources` and its code in i18n.ts. The tests check that every
// language has every key and every error code.

const en = {
  common: enCommon,
  errors: enErrors,
  home: enHome,
};

export const resources = { en } satisfies Record<
  string,
  Record<keyof typeof en, object>
>;

export type ErrorCode = keyof typeof enErrors;

export const isErrorCode = (code: string): code is ErrorCode =>
  Object.hasOwn(enErrors, code);

// English is the source of the keys: t() accepts only keys that exist.
// The namespaces after the first are named in a key ("home:title"); the
// first is the default ("retry").
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: ['common', ...Exclude<keyof typeof en, 'common'>[]];
    resources: typeof en;
  }
}
