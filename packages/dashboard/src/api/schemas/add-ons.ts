// What the page reads of the add-ons: every one there is (on or off), what
// each brings and shows, the stages of work they make up, and the jobs the
// factory fills once for all of them (slots).

import { z } from "zod";

import type {
  AddOnView as ServedAddOn,
  ShownPart as ServedPart,
  ShownView as ServedView,
  SlotState as ServedSlot,
  StagesView as ServedStages,
} from "../../../../server/src/api.ts";

// The icons a team's page or Home block can show (the core's VIEW_ICONS).
const viewIconSchema = z.enum([
  "puzzle",
  "list",
  "check",
  "flag",
  "calendar",
  "chart",
  "note",
  "star",
]);

const viewItemSchema = z.object({
  title: z.string(),
  about: z.string().optional(),
  tag: z.string().optional(),
});

export const shownPartSchema = z.discriminatedUnion("show", [
  z.object({
    show: z.literal("text"),
    title: z.string().optional(),
    text: z.string(),
  }),
  z.object({
    show: z.literal("list"),
    title: z.string().optional(),
    items: z.array(viewItemSchema),
    empty: z.string().optional(),
  }),
]) satisfies z.ZodType<ServedPart>;

export const shownViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string().optional(),
  icon: viewIconSchema,
  parts: z.array(shownPartSchema),
}) satisfies z.ZodType<ServedView>;

const namedSchema = z.object({ id: z.string(), name: z.string() });

export const addOnViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  builtIn: z.boolean(),
  on: z.boolean(),
  tracker: z.boolean(),
  always: z.boolean(),
  needs: z.array(z.string()),
  slots: z.array(z.string()),
  brings: z.object({
    pages: z.array(z.string()),
    blocks: z.array(z.string()),
    kobolds: z.array(z.string()),
    stages: z.array(z.string()),
  }),
  screens: z.object({
    pages: z.array(shownViewSchema),
    blocks: z.array(shownViewSchema),
    stages: z.array(namedSchema),
  }),
  settings: z.array(z.string()),
}) satisfies z.ZodType<ServedAddOn>;

export const stagesViewSchema = z.object({
  order: z.array(
    namedSchema.extend({
      by: z.string(),
      checks: z.array(namedSchema),
    }),
  ),
  clash: z.object({ first: z.string(), second: z.string() }).nullable(),
}) satisfies z.ZodType<ServedStages>;

export const slotStateSchema = z.object({
  slot: z.enum(["code", "tasks"]),
  fillers: z.array(z.string()),
  inUse: z.string().nullable(),
}) satisfies z.ZodType<ServedSlot>;

export type ShownPart = z.infer<typeof shownPartSchema>;
export type ShownView = z.infer<typeof shownViewSchema>;
export type AddOnView = z.infer<typeof addOnViewSchema>;
export type StagesView = z.infer<typeof stagesViewSchema>;
