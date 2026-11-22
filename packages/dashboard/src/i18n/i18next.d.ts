// i18next checks every key the page asks for against the English words.

import "i18next";

import type { resources } from "./resources.ts";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: (typeof resources)["en"];
    returnNull: false;
  }
}
