// What the feedback page reads (GET /api/feedback): the public board's
// posts, and what this person sent or gave a thumbs-up to.

import { z } from "zod";

import type {
  Kind,
  Post,
  State,
} from "../../../../server/src/feedback/board.ts";
import type { FeedbackView as Served } from "../../../../server/src/feedback/routes.ts";

export const feedbackKindSchema = z.enum([
  "bug",
  "wish",
]) satisfies z.ZodType<Kind>;

export const feedbackStateSchema = z.enum([
  "sent",
  "seen",
  "planned",
  "done",
]) satisfies z.ZodType<State>;

export const feedbackPostSchema = z.object({
  number: z.number(),
  kind: feedbackKindSchema,
  title: z.string(),
  body: z.string(),
  thumbs: z.number(),
  state: feedbackStateSchema,
  at: z.string(),
  url: z.string(),
  by: z.string(),
}) satisfies z.ZodType<Post>;

export const feedbackViewSchema = z.object({
  board: z.string(),
  url: z.string(),
  login: z.string().nullable(),
  posts: z.array(feedbackPostSchema),
  mine: z.array(feedbackPostSchema.extend({ own: z.boolean() })),
}) satisfies z.ZodType<Served>;

export type FeedbackKind = z.infer<typeof feedbackKindSchema>;
export type FeedbackState = z.infer<typeof feedbackStateSchema>;
export type FeedbackPost = z.infer<typeof feedbackPostSchema>;
export type FeedbackView = z.infer<typeof feedbackViewSchema>;
