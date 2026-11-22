// What the page reads of the factory's state (GET /api/state and every
// change after it): the setup while there is no factory yet, then the whole
// factory.

import { z } from "zod";

import type { State as Served } from "../../../../server/src/api.ts";
import {
  addOnViewSchema,
  slotStateSchema,
  stagesViewSchema,
} from "./add-ons.ts";
import { coachViewSchema, ideaViewSchema } from "./coach.ts";
import { companySchema } from "./company.ts";
import { partViewSchema } from "./parts.ts";
import { jobSchema, kitViewSchema, productViewSchema } from "./products.ts";
import { groupViewSchema } from "./setting-groups.ts";
import { boardSchema, workViewSchema } from "./work.ts";

export const stateSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("setup"),
    project: z.string(),
    kits: z.array(kitViewSchema),
    jobs: z.array(jobSchema),
    coach: coachViewSchema,
  }),
  z.object({
    mode: z.literal("factory"),
    project: z.string(),
    root: z.string(),
    company: companySchema,
    products: z.array(productViewSchema),
    parts: z.array(partViewSchema),
    settings: z.array(groupViewSchema),
    problems: z.array(z.string()),
    kits: z.array(kitViewSchema),
    jobs: z.array(jobSchema),
    ideas: z.array(ideaViewSchema),
    work: workViewSchema.nullable(),
    board: boardSchema,
    addOns: z.array(addOnViewSchema),
    stages: stagesViewSchema,
    slots: z.array(slotStateSchema),
    onboarding: z.boolean(),
  }),
]) satisfies z.ZodType<Served>;

export type State = z.infer<typeof stateSchema>;

// The state once there is a factory (before, the page shows only setup).
export type FactoryState = Extract<State, { mode: "factory" }>;
