// What a person does to the records from the Understand pages: a new
// source, a signal moved where it belongs, "Looks good" on what the kobold
// sorted, and a real problem the kobold suggested confirmed. The kobold
// proposes, a person confirms: whoever confirms is named in `by` instead of
// the kobold.

import {
  KOBOLD,
  type RecordStore,
  type Signal,
  SOURCE_KINDS,
  type Source,
} from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { Edit } from "./edit.ts";
import { place } from "./placing.ts";

const id = z.string().min(1);

export const newSourceSchema = z.strictObject({
  name: z.string().trim().min(1),
  kind: z.enum(SOURCE_KINDS),
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
  const base = slug(name);
  let key = base;
  let n = 1;
  while (taken.has(key)) key = `${base}-${String(++n)}`;
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

// A person agrees with where the kobold put a signal; a story the kobold
// started from it is no longer new.
export function looksGood(store: RecordStore, signal: string, by: string) {
  const edit = new Edit(store);
  const record = edit.get("signals", signal, "signal");
  if (record.wentTo === null)
    throw new Refused("It is not sorted yet: move it where it belongs.");
  edit.put("signals", { ...record, by });
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

function slug(name: string): string {
  const made = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return made || "source";
}
