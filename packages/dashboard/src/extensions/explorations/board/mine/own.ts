// What the team put on the board themselves, sorted out of its things:
// sketch cards, the pen marks on cards (a sketch or any other), one-line
// notes and links. Plain rules, so they are checked: which are on the
// layer, where the pen can draw, how a sketch card grows around its marks.

import type { Thing, ThingNode } from "../nodes";

export type Point = readonly [number, number];
export type Box = { x: number; y: number; width: number; height: number };

type Placed<T> = T & { place: { x: number; y: number } };
export type Sketch = Placed<Extract<Thing, { kind: "sketch" }>>;
export type Mark = Extract<Thing, { kind: "mark" }>;
export type Note = Placed<Extract<Thing, { kind: "note" }>>;
export type Link = Placed<Extract<Thing, { kind: "link" }>>;
export type Own = {
  sketches: Sketch[];
  marks: Mark[];
  notes: Note[];
  links: Link[];
};

export function ownOf(things: Thing[]): Own {
  const own: Own = { sketches: [], marks: [], notes: [], links: [] };
  for (const thing of things) {
    if (thing.kind === "mark") own.marks.push(thing);
    else if (thing.place === null) continue;
    else if (thing.kind === "sketch")
      own.sketches.push({ ...thing, place: thing.place });
    else if (thing.kind === "link")
      own.links.push({ ...thing, place: thing.place });
    else if (thing.kind === "note" && thing.by === "person")
      own.notes.push({ ...thing, place: thing.place });
  }
  return own;
}

// Where the pen can draw: the board's cards and the team's sketch cards,
// each with the corner its marks are kept from (so they move with it) and
// the box they are cut to.
export type Target = {
  id: string;
  ox: number;
  oy: number;
  box: Box;
  sketch: boolean;
};
export type Drawing = { on: string; points: Point[] };

const PADDING = 20;
const LEAST = { width: 80, height: 60 };

// A sketch card is as big as its marks (the one being drawn too), with some
// padding, and never smaller than a little drawing area.
export function sketchBox(
  card: Sketch,
  marks: Mark[],
  live: Drawing | null,
): Box {
  const { x, y } = card.place;
  const points: Point[] = marks.flatMap((one) =>
    one.on === card.id ? one.points : [],
  );
  if (live?.on === card.id)
    points.push(...live.points.map(([px, py]) => [px - x, py - y] as const));
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const left = Math.min(0, ...xs) - PADDING;
  const top = Math.min(0, ...ys) - PADDING;
  const right = Math.max(0, ...xs) + PADDING;
  const bottom = Math.max(0, ...ys) + PADDING;
  return {
    x: x + left,
    y: y + top,
    width: Math.max(LEAST.width, right - left),
    height: Math.max(LEAST.height, bottom - top),
  };
}

export function targetsOf(
  nodes: ThingNode[],
  own: Own,
  live: Drawing | null,
): Target[] {
  const things = nodes.map((n) => ({
    id: n.id,
    ox: n.position.x,
    oy: n.position.y,
    sketch: false,
    box: {
      x: n.position.x,
      y: n.position.y,
      width: n.measured?.width ?? n.width ?? 0,
      height: n.measured?.height ?? n.height ?? 0,
    },
  }));
  const sketches = own.sketches.map((card) => ({
    id: card.id,
    ox: card.place.x,
    oy: card.place.y,
    sketch: true,
    box: sketchBox(card, own.marks, live),
  }));
  return [...things, ...sketches];
}

// The card under a point on the board: sketch cards lie over the board's
// cards, the last drawn on top.
export function targetAt(targets: Target[], [x, y]: Point): Target | undefined {
  const inside = (t: Target) =>
    x >= t.box.x &&
    x <= t.box.x + t.box.width &&
    y >= t.box.y &&
    y <= t.box.y + t.box.height;
  return (
    [...targets].reverse().find((t) => t.sketch && inside(t)) ??
    [...targets].reverse().find(inside)
  );
}
