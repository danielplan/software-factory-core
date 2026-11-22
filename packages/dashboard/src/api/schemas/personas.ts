// What the Personas pages read: the personas (GET /api/kobble/personas),
// one persona (GET /api/kobble/persona?id=), one test (GET
// /api/kobble/test?id=) and the mission the kobold suggests (GET
// /api/kobble/mission?persona=).

import { z } from "zod";

import {
  kobblePersonaSchema,
  personaTestSchema as coreTestSchema,
} from "../../../../core/src/kobble/schemas.ts";
import type { MissionIdea as ServedIdea } from "../../../../server/src/extensions/personas/mission-ideas.ts";
import type {
  PersonaPage as ServedPage,
  PersonaRow as ServedRow,
  personasView,
  TestPage as ServedTest,
} from "../../../../server/src/extensions/personas/views.ts";
import { faceSchema } from "./faces.ts";
import { missionNowSchema, signalRowSchema } from "./signals.ts";

// A persona, always with its face.
const withFaceSchema = z.object({
  ...kobblePersonaSchema.shape,
  face: faceSchema,
});

// A persona test (a mission): what the persona did, step by step.
const personaTestSchema = z.object(coreTestSchema.shape);

const personaRowSchema = z.object({
  ...withFaceSchema.shape,
  signals: z.number(),
  onMission: z.boolean(),
}) satisfies z.ZodType<ServedRow>;

export const personasSchema = z.object({
  personas: z.array(personaRowSchema),
}) satisfies z.ZodType<ReturnType<typeof personasView>>;

export const personaPageSchema = z.object({
  persona: withFaceSchema,
  signals: z.array(signalRowSchema),
  tests: z.array(personaTestSchema),
}) satisfies z.ZodType<ServedPage>;

export const testPageSchema = z.object({
  test: personaTestSchema,
  persona: withFaceSchema,
  signals: z.array(signalRowSchema),
}) satisfies z.ZodType<ServedTest>;

// The mission the kobold suggests, and the app (product) to try it in.
const missionIdeaSchema = z.object({
  task: z.string(),
  product: z.string().nullable(),
  app: z.string().nullable(),
}) satisfies z.ZodType<ServedIdea>;

export const missionIdeaAnswerSchema = z.object({
  mission: missionIdeaSchema,
}) satisfies z.ZodType<{ mission: ServedIdea }>;

export type PersonaRow = z.infer<typeof personaRowSchema>;
export type PersonaPage = z.infer<typeof personaPageSchema>;
export type TestPage = z.infer<typeof testPageSchema>;
export type PersonaTest = z.infer<typeof personaTestSchema>;
export type MissionIdea = z.infer<typeof missionIdeaSchema>;
export type MissionNow = z.infer<typeof missionNowSchema>;
