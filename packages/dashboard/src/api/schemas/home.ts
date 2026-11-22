// What Home reads (GET /api/home-layout): the team's arrangement of Home,
// or null when nobody arranged it yet. The server's Layout is not exported,
// so the page's own Layout (lib/home-layout.ts) is inferred from here.

import { z } from "zod";

export const layoutSchema = z.object({
  order: z.array(z.string()),
  hidden: z.array(z.string()),
});

export type Layout = z.infer<typeof layoutSchema>;

// No named type on the server: built inline in the route
// (home-layout.ts: `{ layout: layoutIn(file) }`).
export const homeLayoutSchema = z.object({
  layout: layoutSchema.nullable(),
});
