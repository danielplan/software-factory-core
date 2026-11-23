// What the updates part of the page reads: the folder following GitHub's
// main with the newer Kobble beside it (GET /api/updates), and what each
// Kobble release changed (GET /api/updates/whats-new?language=).

import { z } from "zod";

import type { UpdatesView as ServedUpdates } from "../../../../server/src/updates/served.ts";
import type { KobbleNotesView as ServedWhatsNew } from "../../../../server/src/updates/kobble-notes.ts";

import { releaseChangeSchema } from "./releases.ts";

const releaseSchema = z.object({
  newest: z.string().nullable(),
  card: z.object({ number: z.number(), url: z.string() }).nullable(),
});

export const updatesViewSchema = z.object({
  byItself: z.boolean(),
  looking: z.boolean(),
  updating: z.boolean(),
  waiting: z.object({ count: z.number(), titles: z.array(z.string()) }),
  blocked: z
    .object({ reason: z.string(), files: z.array(z.string()) })
    .nullable(),
  offline: z.boolean(),
  lastLookAt: z.string().nullable(),
  lastUpdate: z.object({ at: z.string(), count: z.number() }).nullable(),
  step: z.string().nullable(),
  release: releaseSchema,
}) satisfies z.ZodType<ServedUpdates>;

const whatsNewReleaseSchema = z.object({
  version: z.string(),
  date: z.string().nullable(),
  changes: z.array(releaseChangeSchema),
});

export const whatsNewViewSchema = z.object({
  current: z.string(),
  newest: z
    .object({
      version: z.string(),
      release: whatsNewReleaseSchema.nullable(),
    })
    .nullable(),
  offline: z.boolean(),
  checkedAt: z.string().nullable(),
  releases: z.array(whatsNewReleaseSchema),
  problem: z.boolean(),
}) satisfies z.ZodType<ServedWhatsNew>;

export type UpdatesView = z.infer<typeof updatesViewSchema>;
export type WhatsNewView = z.infer<typeof whatsNewViewSchema>;
