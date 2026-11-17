// Where the board looks: it fits the things after each layout, until a
// person moves or zooms it; then only when a new thing comes. It moves to a
// thing the kobold points at.

import { type OnMoveStart, useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";

import type { ThingNode } from "./nodes";

export function useBoardView(
  nodes: ThingNode[],
  arranged: number,
  pointed: { thing: string; times: number } | null,
): OnMoveStart {
  const { fitView } = useReactFlow<ThingNode>();
  const view = useRef({ count: 0, touched: false });
  useEffect(() => {
    if (arranged === 0) return;
    const more = nodes.length > view.current.count;
    view.current.count = nodes.length;
    if (view.current.touched && !more) return;
    void fitView({ duration: 400, padding: 0.12, maxZoom: 1 });
  }, [arranged, nodes.length, fitView]);

  const thing = pointed?.thing ?? null;
  const times = pointed?.times ?? 0;
  const there = thing !== null && nodes.some((n) => n.id === thing);
  useEffect(() => {
    if (thing && there)
      void fitView({
        nodes: [{ id: thing }],
        duration: 600,
        maxZoom: 1,
        padding: 0.4,
      });
  }, [thing, times, there, fitView]);

  // Moved by a person (an event), not by fitting the view.
  return (event) => {
    if (event) view.current.touched = true;
  };
}
