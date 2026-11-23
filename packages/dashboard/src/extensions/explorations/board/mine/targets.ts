// Where the pen can draw: the board's cards (things) and the person's own
// sketch cards, each with the corner its drawings are kept from (so they move
// with it) and the box they are cut to. A sketch card either has the size
// it was placed with, or grows around its drawings (with some padding), the
// stroke being drawn included.

import type { ThingNode } from "../nodes";
import type { Item, Point } from "./mine-state";

export type Box = { x: number; y: number; width: number; height: number };
export type Target = {
  id: string;
  // The corner the card's drawings are kept from.
  ox: number;
  oy: number;
  box: Box;
  sketch: boolean;
};
export type Drawing = { on: string; points: Point[] };

const PADDING = 20;
const LEAST = { width: 80, height: 60 };

export function targetsOf(
  nodes: ThingNode[],
  items: Item[],
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
  const sketches = items.flatMap((item) => {
    if (item.kind !== "sketch") return [];
    if (item.fixed)
      return [
        {
          id: item.id,
          ox: item.x,
          oy: item.y,
          sketch: true,
          box: { x: item.x, y: item.y, ...item.fixed },
        },
      ];
    // Its drawings (and the one being drawn), from its corner.
    const points: Point[] = items.flatMap((one) =>
      one.kind === "mark" && one.on === item.id ? one.points : [],
    );
    if (live?.on === item.id)
      points.push(
        ...live.points.map(([x, y]) => [x - item.x, y - item.y] as const),
      );
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const left = Math.min(0, ...xs) - PADDING;
    const top = Math.min(0, ...ys) - PADDING;
    const right = Math.max(0, ...xs) + PADDING;
    const bottom = Math.max(0, ...ys) + PADDING;
    return [
      {
        id: item.id,
        ox: item.x,
        oy: item.y,
        sketch: true,
        box: {
          x: item.x + left,
          y: item.y + top,
          width: Math.max(LEAST.width, right - left),
          height: Math.max(LEAST.height, bottom - top),
        },
      },
    ];
  });
  return [...things, ...sketches];
}

// The card under a point on the board: sketch cards lie over the board's
// things, the last drawn on top.
export function targetAt(
  targets: Target[],
  [x, y]: Point,
): Target | undefined {
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
