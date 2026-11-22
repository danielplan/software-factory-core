// What the page reads for its language (GET /api/language): the owner's
// choice on this computer, or "browser" when they leave it to the browser.

import { z } from "zod";

import type { LanguageChoice } from "../../../../core/src/index.ts";

const languageChoiceSchema = z.enum([
  "browser",
  "en",
  "it",
  "de",
]) satisfies z.ZodType<LanguageChoice>;

// No named type on the server: built inline in the route
// (server/src/language.ts: `{ choice: languageChoice(root) }`).
export const languageAnswerSchema = z.object({
  choice: languageChoiceSchema,
});
