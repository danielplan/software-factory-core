import enApp from "@/i18n/locales/en/app.json";
import enErrors from "@/i18n/locales/en/errors.json";
import enHome from "@/i18n/locales/en/home.json";

// Every text of the app, one file per area and language
// (locales/<language>/<area>.json). A new language is one more folder, one
// more entry here and one more name in i18n.ts; the tests check that it has
// every key and every error code.

const en = { app: enApp, errors: enErrors, home: enHome };

export const resources = { en } satisfies Record<
  string,
  Record<keyof typeof en, object>
>;

type ErrorCode = keyof typeof enErrors;

export const isErrorCode = (code: string): code is ErrorCode =>
  Object.hasOwn(enErrors, code);

// English is the source of the keys: t() accepts only keys that exist.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "app";
    resources: typeof en;
  }
}
