// A board.json in the first shape (a question, options, prototypes and
// notes in lists) read as the board it is now: things joined by arrows.
// The problem comes first, then the choice with its options, a prototype
// for each option that has one (an arrow from the choice, labelled with
// its letter), and the notes beside the choice.

import { z } from "zod";

import type { Board, Thing } from "./schemas.ts";

const earlierSchema = z.object({
  question: z.string(),
  options: z.array(
    z.object({ key: z.string(), name: z.string(), difference: z.string() }),
  ),
  prototypes: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      difference: z.string(),
      branch: z.string(),
      agreed: z.boolean(),
      tests: z.array(z.string()),
    }),
  ),
  notes: z.array(z.string()),
});

const by = "kobold" as const;

// The board in its present shape, or null when it is not the first shape.
export function fromEarlier(data: unknown): unknown {
  const earlier = earlierSchema.safeParse(data);
  if (!earlier.success) return null;
  const { question, options, prototypes, notes } = earlier.data;
  const fresh = { agreed: false, place: null, by };
  const things: Thing[] = [{ id: "problem", kind: "problem", ...fresh }];
  const links: Board["links"] = [];
  if (question || options.length > 0) {
    things.push({
      id: "choice",
      kind: "choice",
      ...fresh,
      title: question || "Which way?",
      options,
      chosen: prototypes.find((one) => one.agreed)?.key ?? null,
    });
    links.push({ id: "l-problem", from: "problem", to: "choice", label: "" });
  }
  for (const made of prototypes) {
    const id = `proto-${made.key.toLowerCase()}`;
    things.push({ id, kind: "prototype", ...fresh, ...made, by });
    links.push({ id: `l-${id}`, from: "choice", to: id, label: made.key });
  }
  notes.forEach((text, at) => {
    things.push({ id: `note-${String(at + 1)}`, kind: "note", ...fresh, text });
  });
  return { things, links };
}
