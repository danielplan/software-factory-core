// What a person does to the records from the Understand pages: a new
// source, a new persona, a signal moved where it belongs, "Looks good" on
// what the kobold sorted, and a real problem or a persona the kobold
// suggested confirmed. The kobold proposes, a person confirms: whoever
// confirms is named in `by` instead of the kobold.

import {
  KOBOLD,
  type Persona,
  type RecordStore,
  type Signal,
  SOURCE_KINDS,
  type Source,
} from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { Edit, idFrom } from "./edit.ts";
import { place } from "./placing.ts";

const id = z.string().min(1);

export const newSourceSchema = z.strictObject({
  name: z.string().trim().min(1),
  kind: z.enum(SOURCE_KINDS),
});

// A new persona, made by a person or by the kobold when no persona fits a
// signal: a made-up name, never a real person's, and the kind of user.
export const newPersonaSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1)
    .describe(
      "A made-up first name, never the name of someone who wrote a signal or of a customer.",
    ),
  role: z
    .string()
    .trim()
    .min(1)
    .describe(
      "The kind of user, in a few words, as the product's people say it: “Salon owner who takes bookings online”.",
    ),
  description: z
    .string()
    .trim()
    .default("")
    .describe("What they do with the product, in a sentence."),
  wants: z
    .array(z.string().trim().min(1))
    .default([])
    .describe("What they want, a few short lines."),
});

// Where a person moves a signal: a scene of a story, Build (a bug), answered,
// or a new story, which the kobold writes (for this persona, when named).
export const moveSchema = z.strictObject({
  signal: id,
  to: z.discriminatedUnion("to", [
    z.strictObject({
      to: z.literal("scene"),
      story: id,
      scene: z.number().int().min(1),
    }),
    z.strictObject({ to: z.literal("build") }),
    z.strictObject({ to: z.literal("answered") }),
    z.strictObject({ to: z.literal("newStory"), persona: id.optional() }),
  ]),
});

export type Move = z.infer<typeof moveSchema>;

// A body as what the schema says, or refused with why.
export function parsed<T>(schema: z.ZodType<T>, body: unknown, what: string) {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new Refused(
      `This ${what} does not fit: ${z.prettifyError(result.error)}`,
    );
  return result.data;
}

// A new source, its id made from its name.
export function addSource(store: RecordStore, asked: unknown): Source {
  const { name, kind } = parsed(newSourceSchema, asked, "source");
  const taken = new Set(store.list("sources").map((s) => s.id));
  if (store.list("sources").some((s) => s.name === name))
    throw new Refused(`There is a source “${name}” already.`);
  const key = idFrom(name, taken, "source");
  const edit = new Edit(store);
  edit.put("sources", { id: key, name, kind });
  edit.save(store);
  return { id: key, name, kind };
}

// The signal moved by a person (not to a new story: the kobold writes
// that one); what was done, in a line.
export function moveSignal(
  store: RecordStore,
  id: string,
  to: Exclude<Move["to"], { to: "newStory" }>,
  by: string,
): string {
  const edit = new Edit(store);
  const signal = edit.get("signals", id, "signal");
  const sortedAs = sortedFor(signal, to.to);
  const moved = { ...signal, sortedAs, by, why: `Moved here by ${by}.` };
  const done = place(edit, moved, to, by);
  edit.save(store);
  return done;
}

function sortedFor(signal: Signal, to: Move["to"]["to"]): Signal["sortedAs"] {
  if (to === "answered") return "question";
  if (to !== "build") return "need";
  return signal.sortedAs === "update" ? "update" : "bug";
}

// A person agrees with where the kobold put a signal, and with who it
// sounds like: a story the kobold started from it is no longer new, and a
// persona the kobold made for it is the team's.
export function looksGood(store: RecordStore, signal: string, by: string) {
  const edit = new Edit(store);
  const record = edit.get("signals", signal, "signal");
  if (record.wentTo === null)
    throw new Refused("It is not sorted yet: move it where it belongs.");
  edit.put("signals", { ...record, by });
  const persona = edit.find("personas", record.soundsLike ?? "");
  if (persona?.by === KOBOLD) edit.put("personas", { ...persona, by });
  for (const story of edit.records.stories)
    if (
      story.isNew &&
      "signals" in story.from &&
      story.from.signals.includes(signal)
    )
      edit.put("stories", { ...story, isNew: false });
  edit.save(store);
}

// A person confirms the real problem the kobold suggested.
export function confirmRealProblem(store: RecordStore, id: string, by: string) {
  const edit = new Edit(store);
  const real = edit.get("realProblems", id, "real problem");
  if (real.by !== KOBOLD) throw new Refused(`${real.by} confirmed it already.`);
  edit.put("realProblems", { ...real, by });
  edit.save(store);
}

// A new persona in the edit, its id made from its name; refused when one
// with the same name or role is there already, so there are no two of one
// kind of user.
export function putPersona(edit: Edit, asked: unknown, by: string): Persona {
  const { name, role, description, wants } = parsed(
    newPersonaSchema,
    asked,
    "persona",
  );
  const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
  const like = edit.records.personas.find(
    (p) => same(p.name, name) || same(p.role, role),
  );
  if (like)
    throw new Refused(
      `There is a persona like that already: ${like.id} (${like.name}, ${like.role}).`,
    );
  const taken = new Set(edit.records.personas.map((p) => p.id));
  return edit.put("personas", {
    id: idFrom(name, taken, "persona"),
    name,
    role,
    description,
    wants,
    basedOn: [],
    by,
  });
}

// A new persona, made by a person.
export function addPersona(store: RecordStore, asked: unknown, by: string) {
  const edit = new Edit(store);
  const persona = putPersona(edit, asked, by);
  edit.save(store);
  return persona;
}

// A person confirms the persona the kobold made.
export function confirmPersona(store: RecordStore, id: string, by: string) {
  const edit = new Edit(store);
  const persona = edit.get("personas", id, "persona");
  if (persona.by !== KOBOLD)
    throw new Refused(`${persona.name} is the team's already.`);
  edit.put("personas", { ...persona, by });
  edit.save(store);
}
