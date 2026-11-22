// What the setup's team tiles read (GET /api/setup/team): how many cards are
// built at once, and whether the usage log is on.

import { z } from "zod";

import type { TeamChoices as Served } from "../../../../server/src/coach/setup-team.ts";

export const teamChoicesSchema = z.object({
  cards: z.number(),
  usage: z.boolean(),
}) satisfies z.ZodType<Served>;

export type TeamChoices = z.infer<typeof teamChoicesSchema>;
