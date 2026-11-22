// What the page reads of the work on the connected board: its cards, who
// works them (the builder, the coach), the cards waiting on the owner, and
// which board each tracker add-on is connected to.

import { z } from "zod";

import { STAGES } from "../../../../server/src/api.ts";
import type {
  Asking as ServedAsking,
  Board as ServedBoard,
  BuilderView as ServedBuilder,
  CardView as ServedCard,
  CoachInCardsView as ServedCoach,
  Stage as ServedStage,
  StageMap as ServedStageMap,
  StuckView as ServedStuck,
  WorkView as ServedWork,
} from "../../../../server/src/api.ts";

export const stageSchema = z.enum(STAGES) satisfies z.ZodType<ServedStage>;

export const stageMapSchema = z.record(
  stageSchema,
  z.string(),
) satisfies z.ZodType<ServedStageMap>;

// For each tracker add-on connected (by id): the label of the factory's
// work and the board's column for each stage; more the add-on keeps.
export const boardSchema = z.record(
  z.string(),
  z.looseObject({ label: z.string(), stages: stageMapSchema }),
) satisfies z.ZodType<ServedBoard>;

export const cardViewSchema = z.object({
  number: z.number(),
  title: z.string(),
  stage: stageSchema.nullable(),
  column: z.string(),
  url: z.string(),
  pullRequest: z.string().nullable(),
  pullRequestState: z
    .enum(["open", "draft", "merged", "closed"])
    .nullable()
    .optional(),
  conflict: z.boolean().optional(),
  closed: z.boolean(),
  asks: z.boolean(),
  type: z.enum(["bug", "feature", "improvement"]).nullable().optional(),
  stuck: z.boolean().optional(),
  held: z.string().nullable().optional(),
  hint: z.boolean().optional(),
}) satisfies z.ZodType<ServedCard>;

// A card the builder is on, and its steps so far.
const workingSchema = z.object({
  number: z.number(),
  title: z.string(),
  what: z.string(),
  activity: z.string().nullable(),
  steps: z.array(z.string()),
});

export const builderViewSchema = z.object({
  on: z.boolean(),
  working: workingSchema.nullable(),
  also: z.array(workingSchema),
  activity: z.string().nullable(),
  steps: z.array(z.string()),
  problem: z.string().nullable(),
}) satisfies z.ZodType<ServedBuilder>;

export const coachInCardsViewSchema = z.object({
  on: z.boolean(),
  working: z.number().nullable(),
  also: z.array(z.number()),
  steps: z.array(z.string()),
}) satisfies z.ZodType<ServedCoach>;

export const askingSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  text: z.string(),
  ask: z
    .object({
      about: z.string(),
      where: z.string(),
      question: z.string(),
      answers: z.array(
        z.object({ key: z.string(), answer: z.string(), means: z.string() }),
      ),
      suggested: z.string().nullable(),
    })
    .nullable(),
}) satisfies z.ZodType<ServedAsking>;

export const stuckViewSchema = askingSchema.extend({
  note: z.string(),
  since: z.string(),
}) satisfies z.ZodType<ServedStuck>;

export const workViewSchema = z.object({
  cards: z.array(cardViewSchema),
  problem: z.string().nullable(),
  read: z.string().nullable(),
  builder: builderViewSchema,
  coach: coachInCardsViewSchema,
  asking: z.array(askingSchema).optional(),
  stuck: z.array(stuckViewSchema).optional(),
  signals: z
    .object({
      live: z.boolean(),
      moves: z.boolean(),
      problem: z.string().nullable(),
    })
    .optional(),
}) satisfies z.ZodType<ServedWork>;

export type StageMap = z.infer<typeof stageMapSchema>;
export type Board = z.infer<typeof boardSchema>;
export type CardView = z.infer<typeof cardViewSchema>;
export type WorkView = z.infer<typeof workViewSchema>;
