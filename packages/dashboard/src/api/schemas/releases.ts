// What the Releases page reads (GET /api/releases): the coming release and
// the past ones, or why there are none (no repository connected).

import { z } from "zod";

import type { ReleasesView as Served } from "../../../../server/src/extensions/releases/routes.ts";

const cardTypeSchema = z.enum(["bug", "feature", "improvement"]);

const mergedSchema = z.object({
  number: z.number(),
  title: z.string(),
  url: z.string(),
  type: cardTypeSchema.nullable(),
});

const pastSchema = z.object({
  number: z.string(),
  date: z.string(),
  url: z.string(),
  why: z.string().nullable(),
  notes: z.string(),
});

export const releasesViewSchema = z.discriminatedUnion("connected", [
  z.object({ connected: z.literal(false), problem: z.string() }),
  z.object({
    connected: z.literal(true),
    repository: z.string(),
    last: z.string().nullable(),
    coming: z.object({
      merged: z.array(mergedSchema),
      next: z.string().nullable(),
      why: z.string().nullable(),
    }),
    past: z.array(pastSchema),
  }),
]) satisfies z.ZodType<Served>;

export type ReleasesView = z.infer<typeof releasesViewSchema>;
