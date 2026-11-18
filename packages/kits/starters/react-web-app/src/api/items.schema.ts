import { z } from "zod";

// The answer of GET /api/items: a made-up list that shows where the app's
// data comes from. The new tool replaces it with its own records, one zod
// schema per kind of record, which also gives the types.
const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  note: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
});

export const itemsSchema = z.object({ items: z.array(itemSchema) });

export type Item = z.infer<typeof itemSchema>;
