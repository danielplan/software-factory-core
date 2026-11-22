// What the page reads of the settings groups: each topic, the file it is
// saved in, and its fields with the values set now.

import { z } from "zod";

import type {
  GroupView as ServedGroup,
  SettingView as ServedSetting,
} from "../../../../core/src/index.ts";

export const settingViewSchema = z.object({
  key: z.string(),
  label: z.string(),
  help: z.string(),
  kind: z.enum(["text", "number", "choice", "secret"]),
  default: z.string().optional(),
  pattern: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  choices: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  value: z.string().nullable(),
}) satisfies z.ZodType<ServedSetting>;

export const groupViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  file: z.string(),
  formerly: z.string().optional(),
  usedBy: z.array(z.string()),
  fields: z.array(settingViewSchema),
}) satisfies z.ZodType<ServedGroup>;

export type GroupView = z.infer<typeof groupViewSchema>;
