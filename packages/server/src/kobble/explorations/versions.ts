// An exploration's prototypes as frames of versions: the prototype of an
// option, a frame and its versions, the frame of a choice, whether an
// option has its prototype, free keys and branches, and a new version made
// from another or beside it.

import type { Board } from "@software-factory/core";

import { linked } from "./board-things.ts";

export type Made = Extract<Board["things"][number], { kind: "prototype" }>;

// The prototype of an option, on the board.
export function prototypeOf(board: Board, key: string): Made | null {
  for (const thing of board.things)
    if (thing.kind === "prototype" && thing.key === key) return thing;
  return null;
}

// The frame a prototype shows in: its own, or the one it is a version in.
export function frameOf(made: Made): string {
  return made.frame ?? made.id;
}

// A frame's versions, in the order they were made.
export function versionsOf(board: Board, frame: string): Made[] {
  return board.things.flatMap((thing) =>
    thing.kind === "prototype" && frameOf(thing) === frame ? [thing] : [],
  );
}

// The frame of a choice's prototypes: the one its arrow leads to.
export function frameFor(board: Board, choice: string): string | null {
  for (const link of board.links) {
    if (link.from !== choice) continue;
    const made = board.things.find((thing) => thing.id === link.to);
    if (made?.kind === "prototype") return frameOf(made);
  }
  return null;
}

// Whether a choice's option has its prototype: a version of it in the
// choice's frame, or (on older boards) an arrow from the choice, labelled
// with the option, to a prototype.
export function madeFor(board: Board, choice: string, key: string): boolean {
  const frame = frameFor(board, choice);
  if (frame && versionsOf(board, frame).some((one) => one.option === key))
    return true;
  return board.links.some(
    (link) =>
      link.from === choice &&
      link.label === key &&
      board.things.some(
        (thing) => thing.id === link.to && thing.kind === "prototype",
      ),
  );
}

// The option's letter, or with the first free number when another choice's
// option of that letter has a prototype (A2, A3 …).
export function freeKey(board: Board, key: string): string {
  for (let number = 1; ; number += 1) {
    const name = number === 1 ? key : `${key}${String(number)}`;
    if (!prototypeOf(board, name)) return name;
  }
}

export function prototypeBranch(exploration: string, key: string): string {
  return `proto/${exploration}-${key.toLowerCase()}`;
}

// The arrow from a choice to its frame names every option in it (A · B).
export function namedArrow(board: Board, choice: string, frame: string): Board {
  const options = [
    ...new Set(
      versionsOf(board, frame).map((one) => one.option ?? one.key.charAt(0)),
    ),
  ];
  return linked(board, choice, frame, options.join(" · "));
}

// A new version in a prototype's frame, made from it (`from`) or as
// another way beside it, under the next free key of its letter.
export function versionOf(
  board: Board,
  exploration: string,
  base: Made,
  shape: { name: string; difference: string; from?: string },
): Made {
  const key = freeKey(board, base.key.charAt(0));
  return {
    id: `prototype-${key.toLowerCase()}`,
    kind: "prototype",
    agreed: false,
    place: null,
    by: "kobold",
    key,
    name: shape.name.trim() || base.name,
    difference: shape.difference.trim(),
    branch: prototypeBranch(exploration, key),
    tests: [],
    frame: frameOf(base),
    ...(shape.from ? { from: shape.from } : {}),
    ...(base.option ? { option: base.option } : {}),
  };
}
