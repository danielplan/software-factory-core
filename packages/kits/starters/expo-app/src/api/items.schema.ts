import { z } from 'zod';

// The made-up list of the starter's home screen, as the backend answers
// GET /api/items. Replace it with the new app's own data.
export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  note: z.string().nullable(),
});

export const itemsSchema = z.object({ items: z.array(itemSchema) });

export type Item = z.infer<typeof itemSchema>;
