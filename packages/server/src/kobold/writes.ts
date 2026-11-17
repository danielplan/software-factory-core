// What the kobold writes to the records, through its tools (tools.ts): the
// signal it is sorting, sorted and put in its place (one signal, never
// counted or merged with others), with a new persona when none fits it, and
// a real problem it suggests behind two or more problems of one persona. Everything it writes says `by: kobold`
// until a person confirms it, and the store checks it like any write.

import {
  KOBOLD,
  type RecordStore,
  type Signal,
  SORTED_AS,
} from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { Edit, newId } from "../records/edit.ts";
import { newPersonaSchema, putPersona } from "../records/person.ts";
import { place, placeSchema } from "../records/placing.ts";

export const SORT_INPUT = {
  sortedAs: z
    .enum(SORTED_AS)
    .describe(
      "need: something a person wants or struggles with; bug; question; update (a dependency's or a security update); unsure.",
    ),
  soundsLike: z
    .string()
    .nullable()
    .describe(
      "The persona's id it sounds like, or null when it is not clear or when you give newPersona.",
    ),
  newPersona: newPersonaSchema
    .optional()
    .describe(
      "Only when no persona plausibly fits and the signal clearly comes from one kind of user: a new persona it sounds like, for a person to confirm. Leave soundsLike null then.",
    ),
  why: z
    .string()
    .trim()
    .min(1)
    .describe("Why it sounds like that persona, or why it is not clear."),
  place: placeSchema,
};

export const SUGGEST_INPUT = {
  title: z.string().trim().min(1).describe("The real problem, in a line."),
  description: z
    .string()
    .trim()
    .min(1)
    .describe("Why these problems point the same way, in two lines at most."),
  problems: z
    .array(z.string().min(1))
    .min(2)
    .describe("The ids of the persona's problems it sits behind."),
};

export type Sort = z.infer<z.ZodObject<typeof SORT_INPUT>>;
export type Suggest = z.infer<z.ZodObject<typeof SUGGEST_INPUT>>;

// The signal sorted and placed, with the persona the kobold made for it
// when none fit; what was done, in a line.
export function sortSignal(store: RecordStore, id: string, sort: Sort) {
  const edit = new Edit(store);
  const signal = edit.get("signals", id, "signal");
  const made = sort.newPersona ? madePersona(edit, signal, sort) : null;
  const soundsLike = made?.id ?? sort.soundsLike;
  if (soundsLike !== null) edit.get("personas", soundsLike, "persona");
  if (sort.place.to === "scene") {
    const story = edit.get("stories", sort.place.story, "story");
    if (soundsLike !== story.persona)
      throw new Refused(
        `The story “${story.title}” is ${story.persona}'s: only a signal that sounds like ${story.persona} is evidence in it.`,
      );
  }
  const sorted = {
    ...signal,
    sortedAs: sort.sortedAs,
    soundsLike,
    why: sort.why,
    by: KOBOLD,
  };
  const done = place(edit, sorted, sort.place, KOBOLD);
  edit.save(store);
  return made
    ? `New persona: ${made.name}, ${made.role}, for a person to confirm. ${done}`
    : done;
}

// The persona the kobold makes for a signal no persona fits; never for one
// it gave a persona already, nor from a persona run.
function madePersona(edit: Edit, signal: Signal, sort: Sort) {
  if (sort.soundsLike !== null)
    throw new Refused(
      "Give either soundsLike or newPersona: a signal sounds like one persona.",
    );
  if (edit.find("sources", signal.source)?.kind === "personaRuns")
    throw new Refused(
      "A persona run never makes a persona: it is a check, not a real person.",
    );
  return putPersona(edit, sort.newPersona, KOBOLD);
}

// A real problem behind two or more problems of the persona, none of which
// has one yet; what was done, in a line.
export function suggestRealProblem(
  store: RecordStore,
  persona: string,
  suggest: Suggest,
) {
  const edit = new Edit(store);
  const problems = [...new Set(suggest.problems)].map((p) =>
    edit.get("problems", p, "problem"),
  );
  for (const problem of problems) {
    if (problem.persona !== persona)
      throw new Refused(
        `The problem “${problem.title}” is not ${persona}'s: a real problem sits behind problems of one persona.`,
      );
    if (problem.realProblem !== null)
      throw new Refused(
        `The problem “${problem.title}” has a real problem behind it already.`,
      );
  }
  const real = edit.put("realProblems", {
    id: newId("real"),
    persona,
    title: suggest.title,
    description: suggest.description,
    by: KOBOLD,
  });
  for (const problem of problems)
    edit.put("problems", { ...problem, realProblem: real.id });
  edit.save(store);
  return `Suggested: “${real.title}”, behind ${String(problems.length)} problems. A person confirms it.`;
}

// How many problems of each persona have no real problem behind them.
export function freeProblems(store: RecordStore): Map<string, number> {
  const free = new Map<string, number>();
  for (const problem of store.list("problems"))
    if (problem.realProblem === null)
      free.set(problem.persona, (free.get(problem.persona) ?? 0) + 1);
  return free;
}

// What a tool did, kept for the job's end, and said to the kobold.
export function said(done: string[], line: string): string {
  done.push(line);
  return line;
}
