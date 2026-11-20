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
// Read as one prototype per option: a chain of changes (A → A2 → A3) is
// one prototype iterated, shown at its latest change (agreed when any of
// the chain was), and the arrows to any of the chain lead there; each
// option is joined to its choice. Null when it is not that shape.
type Loose = Record<string, unknown>;

const versionedIn = (thing: Loose) =>
  thing.kind === "prototype" && ("frame" in thing || "option" in thing);

export function fromVersions(data: unknown): unknown {
  const board = data as { things?: Loose[]; links?: Loose[] } | null;
  const things = board?.things;
  if (!Array.isArray(things) || !Array.isArray(board?.links)) return null;
  if (!things.some(versionedIn)) return null;
  const chains = chainsOf(things);
  const isChoice = (id: unknown) =>
    things.some((thing) => thing.id === id && thing.kind === "choice");
  const choiceOf = new Map(
    board.links.filter((l) => isChoice(l.from)).map((l) => [l.to, l.from]),
  );
  const links: Loose[] = [];
  const add = (link: Loose) => {
    if (link.from === link.to) return;
    if (links.some((one) => one.from === link.from && one.to === link.to))
      return;
    links.push(link);
  };
  for (const link of board.links)
    add({
      ...link,
      from: chains.at.get(link.from) ?? link.from,
      to: chains.at.get(link.to) ?? link.to,
    });
  const kept = things.flatMap((thing): Loose[] => {
    if (!versionedIn(thing)) return [thing];
    if (typeof thing.from === "string") return [];
    const last = chains.latest.get(thing.id) ?? thing;
    const { frame, option } = thing;
    const choice = choiceOf.get(typeof frame === "string" ? frame : thing.id);
    if (typeof choice === "string") {
      const label = typeof option === "string" ? option : "";
      const at = links.findIndex(
        (one) => one.from === choice && one.to === last.id,
      );
      if (at >= 0) links[at] = { ...links[at], label };
      else
        add({
          id: `link-${String(last.id)}`,
          from: choice,
          to: last.id,
          label,
        });
    }
    const plain = Object.fromEntries(
      Object.entries(last).filter(
        ([name]) => !["frame", "from", "option"].includes(name),
      ),
    );
    return [
      {
        ...plain,
        place: thing.place ?? null,
        agreed: chains.agreed.has(thing.id),
      },
    ];
  });
  return { things: kept, links };
}

// Each chain of changes: where its things now are (the latest change), the
// latest change of each first one, and which chains are agreed.
function chainsOf(things: Loose[]) {
  const changedTo = new Map<unknown, Loose>();
  for (const thing of things)
    if (versionedIn(thing) && typeof thing.from === "string")
      changedTo.set(thing.from, thing);
  const at = new Map<unknown, unknown>();
  const latest = new Map<unknown, Loose>();
  const agreed = new Set<unknown>();
  for (const first of things) {
    if (!versionedIn(first) || typeof first.from === "string") continue;
    const chain = [first];
    let next = changedTo.get(first.key);
    while (next && !chain.includes(next)) {
      chain.push(next);
      next = changedTo.get(next.key);
    }
    const last = chain.at(-1) ?? first;
    latest.set(first.id, last);
    for (const one of chain) at.set(one.id, last.id);
    if (chain.some((one) => one.agreed === true)) agreed.add(first.id);
  }
  return { at, latest, agreed };
}
