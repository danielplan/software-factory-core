// What the Explorations pages read: the list (GET /api/kobble/explorations)
// and one exploration with its board, prototypes, tests and conversation
// (GET /api/kobble/exploration?id=).

import { z } from "zod";

import {
  PERSONA_COLORS,
  PERSONA_HATS,
} from "../../../../core/src/kobble/face.ts";
import {
  boardSchema,
  explorationSchema,
  TEST_STATUSES,
} from "../../../../core/src/kobble/schemas.ts";
import type {
  ExplorationPage as ServedPage,
  ExplorationRow as ServedRow,
  ExplorationsView as Served,
  TestResult as ServedTest,
} from "../../../../server/src/extensions/explorations/views.ts";
import type { HandingOff as ServedHandingOff } from "../../../../server/src/extensions/explorations/handing-off.ts";
import type { TalkView as ServedTalk } from "../../../../server/src/extensions/explorations/talks.ts";
import type { BoardIdea as ServedIdea } from "../../../../server/src/plugs/work.ts";
import type { VersionRun as ServedRun } from "../../../../server/src/prototypes/mode.ts";

const faceSchema = z.object({
  hat: z.enum(PERSONA_HATS),
  color: z.enum(PERSONA_COLORS),
});

const personaTagSchema = z.object({
  id: z.string(),
  name: z.string(),
  face: faceSchema,
});

// The kinds of things on a board.
const thingKindSchema = z.enum([
  "problem",
  "heard",
  "note",
  "choice",
  "prototype",
  "diagram",
  "picture",
]);

const explorationRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: explorationSchema.shape.status,
  problem: z.string(),
  work: z.number().nullable(),
  personas: z.array(personaTagSchema),
  signals: z.number(),
  things: z.array(
    z.object({
      id: z.string(),
      kind: thingKindSchema,
      agreed: z.boolean(),
      label: z.string(),
    }),
  ),
  links: z.array(z.object({ from: z.string(), to: z.string() })),
  line: z.string().nullable(),
  busy: z.string().nullable(),
}) satisfies z.ZodType<ServedRow>;

// An idea in the board's Backlog nobody explores yet.
const boardIdeaSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
}) satisfies z.ZodType<ServedIdea>;

export const explorationsViewSchema = z.object({
  exploring: z.array(explorationRowSchema),
  waiting: z.array(explorationRowSchema),
  done: z.array(explorationRowSchema),
  fromBoard: z.array(boardIdeaSchema),
}) satisfies z.ZodType<Served>;

// A prototype's last persona test, in short.
const testResultSchema = z.object({
  id: z.string(),
  status: z.enum(TEST_STATUSES),
  steps: z.number(),
  asExpected: z.number(),
  persona: z.string(),
}) satisfies z.ZodType<ServedTest>;

// A prototype's version as prototype mode knows it now.
const versionRunSchema = z.object({
  idea: z.string(),
  version: z.string(),
  state: z.enum(["stopped", "starting", "running", "failed"]),
  making: z.boolean(),
  url: z.string().nullable(),
  activity: z.string().nullable(),
  since: z.string().nullable(),
  steps: z.array(z.string()),
  problem: z.string().nullable(),
  start: z
    .object({
      step: z.enum(["copy", "command"]),
      line: z.string().nullable(),
      since: z.string(),
    })
    .nullable(),
}) satisfies z.ZodType<ServedRun>;

// The conversation with the kobold.
const talkSchema = z.object({
  messages: z.array(
    z.object({ from: z.enum(["kobold", "you"]), text: z.string() }),
  ),
  writing: z.string().nullable(),
  activity: z.string().nullable(),
  problem: z.string().nullable(),
  pointed: z.object({ thing: z.string(), times: z.number() }).nullable(),
}) satisfies z.ZodType<ServedTalk>;

const handingOffSchema = z.object({
  since: z.string(),
  stage: z.enum(["spec", "card", "prototypes"]),
  steps: z.array(z.string()),
}) satisfies z.ZodType<ServedHandingOff>;

// What it heard, with each persona's name and face.
const heardSchema = explorationSchema.shape.heard.element.extend({
  personaName: z.string().nullable(),
  personaFace: faceSchema.nullable(),
});

// The exploration and its board are stored records, sent as they are.
export const explorationPageSchema = z.object({
  exploration: explorationSchema,
  personas: z.array(personaTagSchema),
  heard: z.array(heardSchema),
  board: boardSchema,
  runs: z.array(versionRunSchema),
  canRun: z.boolean(),
  tests: z.record(z.string(), testResultSchema.nullable()),
  talk: talkSchema,
  handingOff: handingOffSchema.nullable(),
  unmade: z.array(z.string()),
}) satisfies z.ZodType<ServedPage>;

export type ExplorationsView = z.infer<typeof explorationsViewSchema>;
export type ExplorationRow = z.infer<typeof explorationRowSchema>;
export type ExplorationPage = z.infer<typeof explorationPageSchema>;
export type TestResult = z.infer<typeof testResultSchema>;
export type VersionRun = z.infer<typeof versionRunSchema>;
