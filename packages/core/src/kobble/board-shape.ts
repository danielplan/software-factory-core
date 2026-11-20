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

// A board from the short-lived versions shape (20 Nov 2026): a prototype's
// versions in one frame (`frame`, `from`, `option`), each on its own branch.
// Read as prototypes of their own: each option joined to its choice, each
// change to the prototype it was made from. Null when it is not that shape.
type Loose = Record<string, unknown>;

export function fromVersions(data: unknown): unknown {
  const board = data as { things?: Loose[]; links?: Loose[] } | null;
  const things = board?.things;
  if (!Array.isArray(things) || !Array.isArray(board?.links)) return null;
  const versioned = (thing: Loose) =>
    thing.kind === "prototype" && ("frame" in thing || "option" in thing);
  if (!things.some(versioned)) return null;
  const byKey = new Map(things.map((thing) => [thing.key, thing.id]));
  const links = [...board.links];
  const isChoice = (id: unknown) =>
    things.some((thing) => thing.id === id && thing.kind === "choice");
  const choiceOf = new Map(
    links
      .filter((link) => isChoice(link.from))
      .map((link) => [link.to, link.from]),
  );
  const cleaned = things.map((thing) => {
    if (!versioned(thing)) return thing;
    const { frame, from, option, ...rest } = thing;
    const base = typeof from === "string" ? byKey.get(from) : undefined;
    const choice = choiceOf.get(typeof frame === "string" ? frame : thing.id);
    const source = base ?? (frame === undefined ? undefined : choice);
    if (source && !links.some((link) => link.to === thing.id))
      links.push({
        id: `link-${String(thing.id)}`,
        from: source,
        to: thing.id,
        label: base ? "changed" : optionOf(option),
      });
    return rest;
  });
  return {
    things: cleaned,
    links: links.map((link) => {
      const made = things.find((t) => t.id === link.to && versioned(t));
      return made &&
        isChoice(link.from) &&
        !made.frame &&
        typeof made.option === "string"
        ? { ...link, label: made.option }
        : link;
    }),
  };
}

function optionOf(option: unknown): string {
  return typeof option === "string" ? option : "";
}
