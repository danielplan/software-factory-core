// What the page reads of a coach: its conversation with the owner and the
// map they draw together (cards in areas, joined by arrows), for the setup
// coach and for each of the factory's ideas.

import { z } from "zod";

import { ICONS } from "../../../../server/src/api.ts";
import type {
  Card as ServedCard,
  CoachMessage as ServedMessage,
  CoachView as ServedCoach,
  Draft as ServedDraft,
  IconName as ServedIcon,
  IdeaView as ServedIdea,
} from "../../../../server/src/api.ts";
import { stageSchema } from "./work.ts";

export const iconNameSchema = z.enum(ICONS) satisfies z.ZodType<ServedIcon>;

export const cardSchema = z.object({
  id: z.string(),
  area: z.string().optional(),
  title: z.string(),
  text: z.string().optional(),
  icon: iconNameSchema.optional(),
  picture: z.string().optional(),
  tone: z.enum(["rule", "question"]).optional(),
  confirmed: z.boolean(),
}) satisfies z.ZodType<ServedCard>;

export const draftSchema = z.object({
  cards: z.array(cardSchema),
  links: z.array(
    z.object({
      id: z.string(),
      from: z.string(),
      to: z.string(),
      label: z.string(),
    }),
  ),
  places: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
  focus: z.object({
    ids: z.array(z.string()),
    areas: z.array(z.string()),
    n: z.number(),
  }),
  ready: z.boolean().optional(),
}) satisfies z.ZodType<ServedDraft>;

export const coachMessageSchema = z.object({
  from: z.enum(["coach", "owner"]),
  text: z.string(),
}) satisfies z.ZodType<ServedMessage>;

export const coachViewSchema = z.object({
  messages: z.array(coachMessageSchema),
  writing: z.string().nullable(),
  activity: z.string().nullable(),
  working: z.boolean(),
  started: z.boolean(),
  problem: z.string().nullable(),
  draft: draftSchema,
  phase: z.enum(["plan", "build"]),
  made: z.boolean(),
}) satisfies z.ZodType<ServedCoach>;

// An idea: its coach's conversation and map, and how far its plan is.
export const ideaViewSchema = coachViewSchema.extend({
  id: z.string(),
  title: z.string(),
  status: z.union([z.literal("draft"), stageSchema]),
  created: z.string(),
  updated: z.string(),
}) satisfies z.ZodType<ServedIdea>;

export type IconName = z.infer<typeof iconNameSchema>;
export type Card = z.infer<typeof cardSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type CoachView = z.infer<typeof coachViewSchema>;
export type IdeaView = z.infer<typeof ideaViewSchema>;
