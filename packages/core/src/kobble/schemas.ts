// Kobble's records as files: the signals that came in from the live app, the
// explorations they lead to, and the personas they come from. Each record is
// one file in the product's repository (store.ts), so the team shares them
// through git like the code.

import { z } from "zod";

import { PERSONA_COLORS, PERSONA_HATS } from "./face.ts";

// An id that is also a file or folder name: letters, digits and dashes.
const fileId = z
  .string()
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9-]*$/,
    "only letters, digits and dashes, starting with a letter or digit",
  );
const text = z.string().trim().min(1);
const time = z.iso.datetime({ offset: true });

export const SIGNAL_TYPES = ["bug", "request", "feedback"] as const;
// Where a signal came from: the app's own "Report a bug" and "Suggest
// something" (app), how people use it, such as the assistant hitting
// something it cannot do (usage), machine errors and failed automations
// (errors), or a persona test (test).
export const SIGNAL_SOURCES = ["app", "usage", "errors", "test"] as const;
export const SIGNAL_STATUSES = [
  "new",
  "explored",
  "fixed",
  "dismissed",
] as const;

// Work that already exists for what a signal says, as the check found it:
// an exploration, or work in the factory.
const alreadySchema = z.strictObject({
  kind: z.enum(["exploration", "work"]),
  id: text,
  title: text,
});

export const kobbleSignalSchema = z.strictObject({
  id: fileId.regex(/^S-\d{4,}$/, "a signal's id is S- and four digits"),
  type: z.enum(SIGNAL_TYPES),
  source: z.enum(SIGNAL_SOURCES),
  // The live event it came from, so the same event never comes in twice;
  // none for a persona test.
  sourceId: text.nullable(),
  // The anonymous customer id, when known.
  customer: text.nullable(),
  persona: fileId.nullable(),
  at: time,
  text,
  status: z.enum(SIGNAL_STATUSES),
  // The exploration or factory item it went to.
  to: text.nullable(),
  already: alreadySchema.nullable(),
});

export const EXPLORATION_STATUSES = [
  "waiting",
  "exploring",
  "handed-off",
  "dropped",
] as const;

export const explorationSchema = z.strictObject({
  id: fileId.regex(/^X-\d+$/, "an exploration's id is X- and a number"),
  title: text,
  status: z.enum(EXPLORATION_STATUSES),
  personas: z.array(fileId),
  signals: z.array(fileId),
  problem: z.string(),
  created: time,
  // The GitHub issue it was handed off as.
  work: z.number().int().positive().nullable(),
});

// A prototype's branch: proto/X-<n>-<key>, the key in small letters.
export const PROTOTYPE_BRANCH = /^proto\/X-\d+-[a-z]+$/;

// The canvas of an exploration (board.json beside it): things joined by
// arrows, laid out left to right along them. Kinds of things: the problem
// (from the exploration itself) and what we heard (its signals), notes, a
// choice (a question and its options, one of which may be chosen), a
// prototype of an option, a diagram (Mermaid, in plain words) and a picture
// a person put on it. Each is a sketch until agreed; a place a person
// dragged it to is kept, the others are laid out on the page.
const optionKey = z
  .string()
  .regex(/^[A-Z]$/, "an option is one capital letter");
const thingId = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "small letters, digits and dashes");

const common = {
  id: thingId,
  agreed: z.boolean(),
  place: z.strictObject({ x: z.number(), y: z.number() }).nullable(),
  // Who put it there: the kobold or a person.
  by: z.enum(["kobold", "person"]),
};

const optionSchema = z.strictObject({
  key: optionKey,
  name: text,
  difference: z.string(),
});

export const thingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...common, kind: z.literal("problem") }),
  z.strictObject({ ...common, kind: z.literal("heard") }),
  z.strictObject({ ...common, kind: z.literal("note"), text }),
  z.strictObject({
    ...common,
    kind: z.literal("choice"),
    title: text,
    options: z.array(optionSchema),
    chosen: optionKey.nullable(),
  }),
  z.strictObject({
    ...common,
    kind: z.literal("prototype"),
    key: optionKey,
    name: text,
    difference: z.string(),
    branch: z
      .string()
      .regex(PROTOTYPE_BRANCH, "a prototype's branch is proto/X-<n>-<key>"),
    // Its persona tests, the last one last.
    tests: z.array(fileId),
  }),
  z.strictObject({
    ...common,
    kind: z.literal("diagram"),
    title: text,
    diagram: text,
  }),
  z.strictObject({
    ...common,
    kind: z.literal("picture"),
    title: text,
    // Its file, in the exploration's pictures/ folder.
    image: z.string().regex(/^[\w-]+\.(png|jpe?g|gif|webp)$/),
  }),
]);

export const linkSchema = z.strictObject({
  id: thingId,
  from: thingId,
  to: thingId,
  label: z.string(),
});

export const boardSchema = z.strictObject({
  things: z.array(thingSchema),
  links: z.array(linkSchema),
});

export const PERSONA_ORIGINS = ["developer", "usage"] as const;

// A made-up person who stands for some of the app's customers.
export const kobblePersonaSchema = z.strictObject({
  id: fileId.regex(/^[a-z0-9-]+$/, "a persona's id is in small letters"),
  name: text,
  place: z.string(),
  about: z.string(),
  // Added by a person on the team, or found in how the app is used.
  origin: z.enum(PERSONA_ORIGINS),
  // The anonymous customer ids it stands for.
  customers: z.array(text),
  // Its kobold's hat and colour; worked out from the id when not given
  // (face.ts).
  face: z
    .strictObject({
      hat: z.enum(PERSONA_HATS),
      color: z.enum(PERSONA_COLORS),
    })
    .optional(),
});

export const TEST_STATUSES = ["queued", "running", "done", "failed"] as const;

// One step of a persona test, from the persona agent's diary: what it did,
// what it expected, whether that happened, and a note in its own words.
const stepSchema = z.strictObject({
  did: text,
  expected: text,
  asExpected: z.boolean(),
  note: z.string().optional(),
});

// A persona test: an agent uses the app as the persona would, on this
// computer only (never the live app), and what surprised it becomes
// signals.
export const personaTestSchema = z.strictObject({
  id: fileId.regex(/^T-\d{4,}$/, "a test's id is T- and four digits"),
  persona: fileId,
  task: text,
  // What it ran on: the app as it is now (main), or a prototype's branch.
  on: z.union([z.literal("main"), z.string().regex(PROTOTYPE_BRANCH)]),
  status: z.enum(TEST_STATUSES),
  started: time.nullable(),
  ended: time.nullable(),
  steps: z.array(stepSchema),
  signals: z.array(fileId),
  // Why it failed, in plain words.
  problem: z.string().nullable(),
});

// When the live app was last read, and where to go on from next time.
export const syncStateSchema = z.strictObject({
  last: time.nullable(),
  cursor: z.string().nullable(),
});

export type KobbleSignal = z.infer<typeof kobbleSignalSchema>;
export type Exploration = z.infer<typeof explorationSchema>;
export type KobblePersona = z.infer<typeof kobblePersonaSchema>;
export type SyncState = z.infer<typeof syncStateSchema>;
export type Already = z.infer<typeof alreadySchema>;
export type PersonaTest = z.infer<typeof personaTestSchema>;
export type TestStep = z.infer<typeof stepSchema>;
export type Board = z.infer<typeof boardSchema>;
export type Thing = z.infer<typeof thingSchema>;
export type BoardLink = z.infer<typeof linkSchema>;
