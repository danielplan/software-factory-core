// A new persona a person on the team adds (the New persona dialog, Sprocket,
// or setup's people), with an id made from the name.

import {
  faceFrom,
  type KobblePersona,
  type KobbleStore,
  PERSONA_COLORS,
  PERSONA_HATS,
} from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../../refused.ts";

const newPersonaSchema = z.object({
  name: z.string().trim().min(1, "Say the persona's name."),
  place: z.string().trim().default(""),
  about: z.string().trim().default(""),
  // The face picked in the dialog; worked out from the id when not given.
  face: z
    .object({ hat: z.enum(PERSONA_HATS), color: z.enum(PERSONA_COLORS) })
    .optional(),
});

// A persona a person on the team adds, with an id made from the name.
export function addPersona(store: KobbleStore, body: unknown): KobblePersona {
  const parsed = newPersonaSchema.safeParse(body);
  if (!parsed.success)
    throw new Refused(parsed.error.issues.map((i) => i.message).join(" "));
  const { name, place, about, face } = parsed.data;
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .join("-") || "persona";
  let id = base;
  let n = 1;
  while (store.get("personas", id)) {
    n += 1;
    id = `${base}-${String(n)}`;
  }
  return store.put("personas", {
    id,
    name,
    place,
    about,
    origin: "developer",
    customers: [],
    face: face ?? faceFrom({ name, about, place }),
  });
}
