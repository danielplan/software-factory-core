// The pen's pointer: where it is (the card under it is lit), a stroke begun
// (on a card, or on empty space where it opens a sketch card), drawn and
// ended (kept from its card's corner, so it moves with the card). A click on
// empty space that drew nothing leaves no card behind.

import { useReactFlow } from "@xyflow/react";
import { useRef, useState } from "react";

import { useMine } from "./mine-state";
import { type Drawing, type Point, type Target, targetAt } from "./own";

// The stroke being drawn, the corner of its card and whether it opened it.
type Going = { drawing: Drawing; corner: Point; opened: boolean };

// A stroke that begins at `start`, on a card, or (none) on empty space.
function startOf(id: string, start: Point, card?: Target): Going {
  return {
    drawing: { on: id, points: [start] },
    corner: card ? [card.ox, card.oy] : start,
    opened: !card,
  };
}

// The stroke as it is kept: from its card's corner, so it moves with it.
function keptOf({ drawing, corner }: Going) {
  return {
    on: drawing.on,
    points: drawing.points.map(
      ([x, y]) => [x - corner[0], y - corner[1]] as const,
    ),
  };
}

export function usePen(
  on: boolean,
  targets: Target[],
  onDrawing: (drawing: Drawing | null) => void,
) {
  const mine = useMine();
  const { screenToFlowPosition } = useReactFlow();
  const going = useRef<Going | null>(null);
  const [lit, setLit] = useState<string | null>(null);
  const at = (event: React.MouseEvent): Point => {
    const p = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    return [p.x, p.y];
  };

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !on) return;
    mine.select(null);
    const start = at(event);
    const card = targetAt(targets, start);
    // A stroke on empty space opens a card of its own around it.
    const id = card?.id ?? mine.open(start);
    event.currentTarget.setPointerCapture(event.pointerId);
    going.current = startOf(id, start, card);
    onDrawing(going.current.drawing);
  };
  const move = (event: React.PointerEvent) => {
    if (!on) return;
    const now = going.current?.drawing;
    const point = at(event);
    if (!now) {
      setLit(targetAt(targets, point)?.id ?? null);
      return;
    }
    const last = now.points[now.points.length - 1] ?? point;
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 2) return;
    now.points.push(point);
    onDrawing({ on: now.on, points: [...now.points] });
  };
  const end = (event: React.PointerEvent) => {
    const now = going.current;
    going.current = null;
    onDrawing(null);
    if (!now) return;
    if (now.opened && now.drawing.points.length < 3) {
      mine.discard(now.drawing.on);
      return;
    }
    const kept = keptOf(now);
    mine.stroke({ on: kept.on, points: [...kept.points] });
    setLit(targetAt(targets, at(event))?.id ?? null);
  };
  return {
    // The card under the pen, while the pen is on.
    over: on ? lit : null,
    at,
    begin,
    move,
    end,
    leave: () => {
      if (!going.current) setLit(null);
    },
  };
}
