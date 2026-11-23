// What the page holds while the server has not answered yet: the things it
// has sent (pending, shown at once as if they were on the board) and the card
// being dragged. The latest of them is kept for what the pointer does after
// a render.

import { useEffect, useRef, useState } from "react";

import type { Thing } from "../nodes";
import { type Own, ownOf, type Point, type Target } from "./own";

export type Dragging = { id: string; x: number; y: number };
export type Stroke = {
  // The card drawn on; a card that is not on the board yet (a new sketch
  // card, `pending-…`) is made with its first stroke.
  on: string;
  // From the card's corner.
  points: Point[];
};

export const PENDING = "pending-";

let count = 0;
export const pendingId = () => `${PENDING}${String(count++)}`;

const made = { agreed: false, by: "person" } as const;

export function sketchOf(id: string, at: Point): Thing {
  return { id, kind: "sketch", ...made, place: { x: at[0], y: at[1] } };
}

export function markOf(
  id: string,
  stroke: Stroke,
): Extract<Thing, { kind: "mark" }> {
  return {
    id,
    kind: "mark",
    ...made,
    place: null,
    on: stroke.on,
    points: stroke.points.map(([x, y]) => [x, y]),
  };
}

export function noteOf(
  id: string,
  text: string,
  at: { x: number; y: number },
): Thing {
  return { id, kind: "note", ...made, place: at, text };
}

export function linkOf(
  id: string,
  url: string,
  at: { x: number; y: number },
): Thing {
  const site = new URL(url).hostname.replace(/^www\./, "");
  return { id, kind: "link", ...made, place: at, url, title: site, site };
}

// A new card goes once its last pending stroke has (and it is made).
export function withoutDone(now: Thing[], made: Set<string>): Thing[] {
  return now.filter(
    (one) =>
      !(
        one.kind === "sketch" &&
        made.has(one.id) &&
        !now.some((m) => m.kind === "mark" && m.on === one.id)
      ),
  );
}

// The things as the page shows them: with the card being dragged where the
// pointer has it.
export function movedBy(all: Thing[], dragging: Dragging | null): Thing[] {
  if (!dragging) return all;
  return all.map((one) =>
    one.id === dragging.id
      ? { ...one, place: { x: dragging.x, y: dragging.y } }
      : one,
  );
}

// What the page holds, and the latest of it for what the pointer does after
// a render.
export type Latest = {
  pending: Thing[];
  dragging: Dragging | null;
  own: Own;
  targets: Target[];
};

export function useHeld(things: Thing[]) {
  const [pending, show] = useState<Thing[]>([]);
  const [dragging, showDragging] = useState<Dragging | null>(null);
  const latest = useRef<Latest>({
    pending: [],
    dragging: null,
    own: ownOf([]),
    targets: [],
  });
  const own = ownOf(movedBy([...things, ...pending], dragging));
  useEffect(() => {
    latest.current.own = own;
  });
  return {
    own,
    // The latest of what is held (read when the pointer does something).
    now: (): Latest => latest.current,
    setPending: (change: (now: Thing[]) => Thing[]) => {
      latest.current.pending = change(latest.current.pending);
      show(latest.current.pending);
    },
    setDragging: (now: Dragging | null) => {
      latest.current.dragging = now;
      showDragging(now);
    },
    // Where the cards are, for the pictures Doodle is given.
    see: (targets: Target[]) => {
      latest.current.targets = targets;
    },
  };
}
