// The language Kobble speaks on this computer. The owner's choice is kept
// in the factory's personal settings (GET and POST /api/language); the
// dashboard says which language it shows (the choice, or the browser's),
// and the kobolds answer in that one (inLanguage, where their instructions
// are put together).

import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  answerIn,
  chooseLanguage,
  FACTORY_FOLDER,
  isLanguageChoice,
  type Language,
  languageChoice,
} from "@software-factory/core";

import type { Route } from "./plugs/extension.ts";
import { Refused } from "./refused.ts";

let shown: Language = "en";

// A kobold's instructions, with the language to answer in.
export function inLanguage(instructions: string): string {
  return `${instructions}${answerIn(shown)}`;
}

export function languageRoutes(project: string): Record<string, Route> {
  const root = join(project, FACTORY_FOLDER);
  return {
    "GET /api/language": () => ({
      choice: existsSync(root) ? languageChoice(root) : "browser",
    }),
    "POST /api/language": (body) => {
      const { choice, spoken } = (body ?? {}) as Record<string, unknown>;
      if (spoken === "en" || spoken === "it" || spoken === "de") shown = spoken;
      if (choice === undefined) return;
      if (!isLanguageChoice(choice))
        throw new Refused("That is not a language Kobble speaks.");
      if (existsSync(root)) chooseLanguage(root, choice);
    },
  };
}
