// What the page reads of the company (its factory.json, with the defaults
// filled in): its name, add-ons, kits, products and own names.

import { z } from "zod";

import type { Company as Served } from "../../../../core/src/index.ts";

export const companySchema = z.object({
  name: z.string(),
  about: z.string(),
  tracker: z.string(),
  extensions: z.array(z.string()),
  without: z.array(z.string()),
  kits: z.array(z.string()),
  core: z.string().optional(),
  products: z.array(z.string()).optional(),
  prototype: z
    .object({
      start: z.string(),
      stop: z.string().optional(),
      remove: z.string().optional(),
    })
    .optional(),
  brand: z
    .object({
      factory: z.string().optional(),
      kobold: z.string().optional(),
    })
    .optional(),
}) satisfies z.ZodType<Served>;
