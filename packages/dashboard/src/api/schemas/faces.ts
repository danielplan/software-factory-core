// What the page reads of a persona's face: a kobold's hat and colour.

import { z } from "zod";

import {
  PERSONA_COLORS,
  PERSONA_HATS,
} from "../../../../core/src/kobble/face.ts";
import type {
  Face as ServedFace,
  PersonaColor as ServedColor,
  PersonaHat as ServedHat,
} from "../../../../core/src/index.ts";

export const personaHatSchema = z.enum(
  PERSONA_HATS,
) satisfies z.ZodType<ServedHat>;

export const personaColorSchema = z.enum(
  PERSONA_COLORS,
) satisfies z.ZodType<ServedColor>;

export const faceSchema = z.object({
  hat: personaHatSchema,
  color: personaColorSchema,
}) satisfies z.ZodType<ServedFace>;

export type PersonaHat = z.infer<typeof personaHatSchema>;
export type PersonaColor = z.infer<typeof personaColorSchema>;
export type Face = z.infer<typeof faceSchema>;
