// What the Signals page reads: the new signals with the sync and the
// missions going on (GET /api/kobble/signals), and the signals already
// handled (GET /api/kobble/handled). A signal row is also read on the
// Personas pages (personas.ts).

import { z } from "zod";

import {
  kobbleSignalSchema,
  personaTestSchema,
} from "../../../../core/src/kobble/schemas.ts";
import type { MissionNow as ServedMission } from "../../../../server/src/plugs/missions.ts";
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

// A persona on a mission now (or waiting), and the step it is on. Offered
// by Personas; kept here because the Signals page reads it too.
export const missionNowSchema = z.object({
  id: z.string(),
  persona: z.string(),
  name: z.string(),
  face: faceSchema,
  status: personaTestSchema.shape.status,
  doing: z.string().nullable(),
}) satisfies z.ZodType<ServedMission>;

export const signalsViewSchema = z.object({
  signals: z.array(signalRowSchema),
  counts: z.object({ new: z.number() }),
  sync: syncViewSchema,
  missions: z.array(missionNowSchema),
}) satisfies z.ZodType<Served>;

export const handledSchema = z.object({
  signals: z.array(signalRowSchema),
}) satisfies z.ZodType<ReturnType<typeof handledView>>;

export type SignalsView = z.infer<typeof signalsViewSchema>;
export type SignalRow = z.infer<typeof signalRowSchema>;
export type SyncView = z.infer<typeof syncViewSchema>;
