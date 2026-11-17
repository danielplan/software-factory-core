// The words' keys are checked: a key that is not in the English files is a
// type error (i18next's own way, https://www.i18next.com/overview/typescript).

import "i18next";

import type { resources } from "./i18n.ts";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof resources)["en"];
  }
}
