// The board's things and arrows, kept in step with the page: things a
// person placed stay where they are; the others are laid out left to right
// in columns along the arrows (layout.ts), then moved down in their column
// where a placed one is (around-placed.ts), once each has been drawn and
// measured, and again whenever one comes, goes or changes size. Until then a thing is drawn invisibly. `arranged`
// counts the layouts, so the view can follow.

import { type Edge, useNodesState } from "@xyflow/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ExplorationPage } from "@/api/client";

import { aroundPlaced } from "@/lib/around-placed";
import { arrange } from "@/lib/layout";
import {
  edgesOf,
  nodesOf,
  ownedByPerson,
  shapeOf,
  type ThingNode,
} from "./nodes";

export function useBoardNodes(
  page: ExplorationPage,
  marks: { pointed: string | null; attached: string[] },
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<ThingNode>([]);
  const edges = useMemo<Edge[]>(() => edgesOf(page), [page]);
  const latest = useRef({ nodes, edges });
  useLayoutEffect(() => {
    latest.current = { nodes, edges };
  });
  const [arranged, setArranged] = useState(0);

  useEffect(() => {
    setNodes((earlier) => nodesOf(page, earlier, marks));
  }, [page, marks, setNodes]);

  const laid = nodes.filter((n) => !ownedByPerson(n));
  const shape = [
    ...laid.map(shapeOf),
    ...edges.map((e) => `${e.source}>${e.target}`),
  ].join("|");
  const measured =
    laid.length > 0 && laid.every((n) => n.measured?.height !== undefined);

  useEffect(() => {
    if (!measured) return;
    let stale = false;
    const rest = latest.current.nodes.filter((n) => !ownedByPerson(n));
    const boxes = rest.map((n) => ({
      id: n.id,
      width: n.measured?.width ?? 0,
      height: n.measured?.height ?? 0,
    }));
    const placed = new Map(
      rest.flatMap((n) =>
        n.data.thing.place ? [[n.id, n.data.thing.place] as const] : [],
      ),
    );
    void arrange(boxes, latest.current.edges).then((laidOut) => {
      if (stale) return;
      const places = aroundPlaced(boxes, laidOut, placed);
      setNodes((now) =>
        now.map((n) => ({
          ...n,
          position: n.data.thing.place ?? places.get(n.id) ?? n.position,
          data: { ...n.data, placed: true },
        })),
      );
      setArranged((count) => count + 1);
    });
    return () => {
      stale = true;
    };
  }, [shape, measured, setNodes]);

  return { nodes, edges, onNodesChange, arranged };
}
