// What the page reads of the kits there are, the company's products, and
// the long jobs the factory runs (making a new product with its starter).

import { z } from "zod";

import type {
  Job as ServedJob,
  KitView as ServedKit,
  ProductView as ServedProduct,
} from "../../../../server/src/api.ts";

export const kitViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  kind: z.string(),
  canCreate: z.boolean(),
  madeBy: z.enum(["kobble", "team"]),
  brings: z.array(z.enum(["rules", "starter", "checks", "tools"])),
}) satisfies z.ZodType<ServedKit>;

export const productViewSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  kit: z.string(),
  about: z.string(),
  folder: z.string(),
  port: z.number().nullable(),
  commands: z.record(z.string(), z.string()),
  users: z.array(z.object({ who: z.string(), does: z.string() })),
}) satisfies z.ZodType<ServedProduct>;

export const jobSchema = z.object({
  id: z.string(),
  label: z.string(),
  state: z.enum(["waiting", "working", "done", "failed"]),
  log: z.array(z.string()),
}) satisfies z.ZodType<ServedJob>;

export type KitView = z.infer<typeof kitViewSchema>;
export type ProductView = z.infer<typeof productViewSchema>;
