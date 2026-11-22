// The page's forms with fields, as zod schemas for react-hook-form: the live
// app's address and token (Signals), a persona added in setup, and an answer
// to the setup kobold's question. A field that does not hold says why with
// one of FORM_PROBLEMS, shown under the field once something was typed in
// it, never on a field nobody has written in. Kept apart from the screens
// so it is checked on its own.

import { z } from "zod";

// Why a field cannot be sent, by the word the page shows for it.
export const FORM_PROBLEMS = {
  needed: "words.form.needed",
  address: "words.form.address",
} as const;

type Problem = keyof typeof FORM_PROBLEMS;

const needed = () =>
  z
    .string()
    .trim()
    .min(1, "needed" satisfies Problem);

// A web address: the server connects only to one (a file: address is for
// trying Kobble from .env, not for connecting).
const READABLE = new Set(["http:", "https:"]);
const isAddress = (text: string) => {
  // Nothing written is said as needed, not as a wrong address.
  if (text === "") return true;
  try {
    return READABLE.has(new URL(text).protocol);
  } catch {
    return false;
  }
};

// The live app's address and its token, both needed.
export const connectSchema = z.object({
  url: needed().refine(isAddress, "address" satisfies Problem),
  token: needed(),
});

// A persona the owner adds: who they are (needed), and what they do.
export const newPersonaSchema = z.object({
  title: needed(),
  text: z.string(),
});

// An answer to one of the kobold's questions: some words.
export const answerSchema = z.object({ answer: needed() });

// The word for why a field does not hold, once something was typed in it;
// null while it holds or nobody wrote in it.
export function problemOf(field: {
  error?: { message?: string };
  isDirty: boolean;
}): (typeof FORM_PROBLEMS)[Problem] | null {
  const said = field.error?.message;
  if (!field.isDirty || said === undefined) return null;
  return Object.hasOwn(FORM_PROBLEMS, said)
    ? FORM_PROBLEMS[said as Problem]
    : FORM_PROBLEMS.needed;
}

// What a field says to a screen reader: whether it holds, and where the
// words for why not are (the FieldProblem under it).
export function markOf(
  field: Parameters<typeof problemOf>[0],
  id: string,
): { "aria-invalid": boolean; "aria-describedby"?: string } {
  return problemOf(field)
    ? { "aria-invalid": true, "aria-describedby": id }
    : { "aria-invalid": false };
}
