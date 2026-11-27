// What the Signals page reads: the new signals with the sync and the
// tests going on (GET /api/kobble/signals), and the signals already
// handled (GET /api/kobble/handled). A signal row is also read on the
// Personas pages (personas.ts).

import { z } from "zod";

import {
  kobbleSignalSchema,
  TEST_STATUSES,
} from "../../../../core/src/kobble/schemas.ts";
import type { TestNow as ServedNow } from "../../../../server/src/plugs/tests.ts";
import type { FixPlan as ServedPlan } from "../../../../server/src/extensions/signals/fix-plan.ts";
import type { SyncView as ServedSync } from "../../../../server/src/extensions/signals/sync.ts";
import type {
  handledView,
  SignalsView as Served,
} from "../../../../server/src/extensions/signals/views.ts";
import { faceSchema } from "./faces.ts";

// A signal with the name and face of its persona, and the column of the
// work it was already fixed in.
export const signalRowSchema = z.object({
  ...kobbleSignalSchema.shape,
  personaName: z.string().nullable(),
  personaFace: faceSchema.nullable(),
  workColumn: z.string().nullable().optional(),
});

// Whether the live app is set up, when it was read and when it reads next.
const syncViewSchema = z.object({
  connected: z.boolean(),
  address: z.string().nullable(),
  last: z.string().nullable(),
  next: z.string().nullable(),
  problem: z.string().nullable(),
}) satisfies z.ZodType<ServedSync>;

// A persona in a test now (or waiting), and the moment they are at.
// Offered by Testing; kept here because the Signals page reads it too.
export const testNowSchema = z.object({
  id: z.string(),
  persona: z.string(),
  name: z.string(),
  face: faceSchema,
  status: z.enum(TEST_STATUSES),
  doing: z.string().nullable(),
}) satisfies z.ZodType<ServedNow>;

export const signalsViewSchema = z.object({
  signals: z.array(signalRowSchema),
  counts: z.object({ new: z.number() }),
  sync: syncViewSchema,
  tests: z.array(testNowSchema),
}) satisfies z.ZodType<Served>;

export const handledSchema = z.object({
  signals: z.array(signalRowSchema),
}) satisfies z.ZodType<ReturnType<typeof handledView>>;

export type SignalsView = z.infer<typeof signalsViewSchema>;
export type TestNow = z.infer<typeof testNowSchema>;
export type SignalRow = z.infer<typeof signalRowSchema>;
export type SyncView = z.infer<typeof syncViewSchema>;

// What the builder would do before Fix makes the card (POST
// /api/kobble/signals/fix-plan).
const fixPlanSchema = z.object({
  title: z.string(),
  happens: z.string(),
  cause: z.string(),
  change: z.array(z.string()),
  check: z.string(),
}) satisfies z.ZodType<ServedPlan>;

export const fixPlanAnswerSchema = z.object({ plan: fixPlanSchema });
export type FixPlan = z.infer<typeof fixPlanSchema>;
