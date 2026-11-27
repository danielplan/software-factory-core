// What the Personas pages read: the personas (GET /api/kobble/personas)
// and one persona (GET /api/kobble/persona?id=).

import { z } from "zod";

import { kobblePersonaSchema } from "../../../../core/src/kobble/schemas.ts";
import type {
  PersonaPage as ServedPage,
  PersonaRow as ServedRow,
  personasView,
} from "../../../../server/src/extensions/personas/views.ts";
import { faceSchema } from "./faces.ts";
import { signalRowSchema } from "./signals.ts";

// A persona, always with its face.
const withFaceSchema = z.object({
  ...kobblePersonaSchema.shape,
  face: faceSchema,
});

const personaRowSchema = z.object({
  ...withFaceSchema.shape,
  signals: z.number(),
}) satisfies z.ZodType<ServedRow>;

export const personasSchema = z.object({
  personas: z.array(personaRowSchema),
}) satisfies z.ZodType<ReturnType<typeof personasView>>;

export const personaPageSchema = z.object({
  persona: withFaceSchema,
  signals: z.array(signalRowSchema),
}) satisfies z.ZodType<ServedPage>;

export type PersonaRow = z.infer<typeof personaRowSchema>;
export type PersonaPage = z.infer<typeof personaPageSchema>;
