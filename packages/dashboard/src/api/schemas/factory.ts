// What the Factory page reads: the board's cards in their columns, what
// waits for the owner and what the builder does (GET /api/kobble/factory),
// and one card opened beside the board (GET /api/kobble/factory/card).

import { z } from "zod";

import type { Asking as ServedAsking } from "../../../../server/src/api.ts";
import type { CardPanel as ServedPanel } from "../../../../server/src/extensions/factory/factory-card.ts";
import type {
  FactoryCard as ServedCard,
  FactoryView as Served,
} from "../../../../server/src/extensions/factory/factory-view.ts";

const cardTypeSchema = z.enum(["bug", "feature", "improvement"]);

const factoryCardSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  from: z
    .object({
      exploration: z.string(),
      title: z.string(),
      key: z.string().nullable(),
    })
    .nullable(),
  fix: z.boolean(),
  type: cardTypeSchema.nullable(),
  pullRequest: z.string().nullable(),
  pullRequestState: z.enum(["open", "draft", "merged", "closed"]).nullable(),
  conflict: z.boolean(),
  resolving: z.boolean(),
  hint: z.boolean(),
}) satisfies z.ZodType<ServedCard>;

// A card where the factory waits for the owner, and the question it asks.
const askingSchema = z.object({
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

// A card the builder got stuck on: its last word, and since when.
const stuckSchema = askingSchema.extend({
  note: z.string(),
  since: z.string(),
});

export const factoryViewSchema = z.object({
  connected: z.boolean(),
  problem: z.string().nullable(),
  read: z.string().nullable(),
  columns: z.array(
    z.object({
      id: z.enum(["todo", "building", "review", "done"]),
      title: z.string(),
      cards: z.array(factoryCardSchema),
    }),
  ),
  waiting: z.array(askingSchema),
  stuck: z.array(stuckSchema),
  builder: z.object({
    on: z.boolean(),
    working: z.string().nullable(),
    cards: z.array(z.number()),
    now: z.record(z.number(), z.string()),
    trace: z.record(z.number(), z.array(z.string())),
  }),
}) satisfies z.ZodType<Served>;

export const cardPanelSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  column: z.string(),
  building: z.boolean(),
  type: cardTypeSchema.nullable(),
  about: z.string(),
  plan: z.string().nullable(),
  status: z.string(),
  said: z.array(
    z.object({
      by: z.enum(["factory", "person"]),
      author: z.string(),
      text: z.string(),
      at: z.string(),
    }),
  ),
  pullRequest: z
    .object({ url: z.string(), state: z.string(), draft: z.boolean() })
    .nullable(),
}) satisfies z.ZodType<ServedPanel>;

export type FactoryView = z.infer<typeof factoryViewSchema>;
export type FactoryCard = z.infer<typeof factoryCardSchema>;
export type CardPanel = z.infer<typeof cardPanelSchema>;
