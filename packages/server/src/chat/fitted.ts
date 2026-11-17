// A request's body as its schema says, or refused with a plain sentence a
// person can act on: the one said for the first field that does not fit, or
// a general one; never the schema's own words (“✖ Invalid option …”). The
// sentences are kept in one place (SAID), so the dashboard can say each in
// the person's language.

import type { z } from "zod";

import { Refused } from "../refused.ts";

// Every sentence a chat or check-up request can be refused with, as the
// server says it; the dashboard translates each (chat/refusals.ts there).
export const SAID = {
  question: "Write a question first.",
  text: "Write the idea first.",
  persona: "Say who the idea is for.",
  files: "Send at most five files, each attached here first.",
  language: "That language is not one the factory speaks.",
  name: "Give the file a name, of 200 letters at most.",
  type: "Only pictures, PDFs and text files can be attached here.",
  data: "That file could not be read.",
  empty: "That file is empty.",
  large: "That file is larger than 7 MB.",
  mismatch: "That file is not what its type says.",
  notText: "That text file could not be read: save it as plain text (UTF-8).",
  product: "Say which product.",
  finding: "Say which finding.",
  otherwise: "That request was not understood.",
} as const;

export type Said = (typeof SAID)[keyof typeof SAID];

// The body as the schema says, or refused with what is said for the first
// field that does not fit (or `otherwise`, for a field it does not know).
export function fitted<T>(
  schema: z.ZodType<T>,
  body: unknown,
  said: Readonly<Record<string, Said>>,
): T {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field =
    issue && issue.code !== "unrecognized_keys" ? issue.path[0] : undefined;
  const sentence = typeof field === "string" ? said[field] : undefined;
  throw new Refused(sentence ?? SAID.otherwise);
}
