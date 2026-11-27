// What the kobold writes for a choice in its tools (board-tools.ts): an
// option, and the trade-offs the options are compared on.

import { z } from "zod";

export const option = z.object({
  key: z
    .string()
    .optional()
    .describe("An option to change (A, B…); none: a new one."),
  name: z.string().optional().describe("A few words."),
  difference: z.string().optional().describe("How it differs, in one line."),
});

// A choice's trade-offs: the points its options are compared on, each with
// a short cell per option.
export const points = z
  .array(
    z.object({
      label: z
        .string()
        .describe(
          "What is compared, a word or two: Cost, Work, Where data lives.",
        ),
      cells: z
        .record(z.string(), z.string())
        .describe(
          'Each option\'s answer by its letter, a few words: {A: "Free", B: "€5 a month"}.',
        ),
    }),
  )
  .max(6);
