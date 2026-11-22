// What the page reads of the parts the launcher runs: each part's light,
// what it is doing, and what went wrong.

import { z } from "zod";

import { AREAS, PART_TYPES } from "../../../../core/src/parts/part.ts";
import type {
  Light as ServedLight,
  PartView as ServedPart,
  Problem as ServedProblem,
} from "../../../../launcher/src/index.ts";

export const lightSchema = z.enum([
  "running",
  "starting",
  "stopped",
  "problem",
  "none",
]) satisfies z.ZodType<ServedLight>;

export const problemSchema = z.object({
  title: z.string(),
  text: z.string(),
  details: z.array(z.string()),
}) satisfies z.ZodType<ServedProblem>;

export const partViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  area: z.enum(AREAS),
  does: z.string(),
  type: z.enum(PART_TYPES).nullable(),
  dependsOn: z.array(z.string()),
  start: z.enum(["auto", "button", "with", "never"]),
  light: lightSchema,
  step: z.string().nullable(),
  problem: problemSchema.nullable(),
  link: z.string().nullable(),
  canStart: z.boolean(),
  canStop: z.boolean(),
  outside: z.boolean(),
}) satisfies z.ZodType<ServedPart>;

export type Light = z.infer<typeof lightSchema>;
export type PartView = z.infer<typeof partViewSchema>;
