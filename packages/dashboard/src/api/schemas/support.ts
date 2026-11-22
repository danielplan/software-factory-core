// What the support bar reads (GET /api/kobble/support): Sprocket's
// conversation, what it is doing now, and where it took the person last.

import { z } from "zod";

import type { SupportView as Served } from "../../../../server/src/kobble/support.ts";

const messageSchema = z.object({
  from: z.enum(["kobold", "you"]),
  text: z.string(),
});

export const supportViewSchema = z.object({
  messages: z.array(messageSchema),
  writing: z.string().nullable(),
  activity: z.string().nullable(),
  problem: z.string().nullable(),
  went: z.object({ to: z.string(), n: z.number() }).nullable(),
}) satisfies z.ZodType<Served>;

export type SupportView = z.infer<typeof supportViewSchema>;
