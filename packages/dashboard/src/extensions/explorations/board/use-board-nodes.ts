// The board's things and arrows, kept in step with the page: things a
// person placed stay where they are; the others are laid out left to right
// in columns along the arrows (layout.ts), without looking at the placed
// ones, once each has been drawn and measured, and again whenever one comes,
// goes or changes size. Until then a thing is drawn invisibly. `arranged`
// counts the layouts, so the view can follow.

import { type Edge, useNodesState } from "@xyflow/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { ExplorationPage } from "@/api/client";

import { arrange } from "@/lib/layout";
import { edgesOf, nodesOf, shapeOf, type ThingNode } from "./nodes";

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

  const shape = [
    ...nodes.map(shapeOf),
    ...edges.map((e) => `${e.source}>${e.target}`),
  ].join("|");
  const measured =
    nodes.length > 0 && nodes.every((n) => n.measured?.height !== undefined);

  useEffect(() => {
    if (!measured) return;
    let stale = false;
    const boxes = latest.current.nodes.map((n) => ({
      id: n.id,
      width: n.measured?.width ?? 0,
      height: n.measured?.height ?? 0,
    }));
    void arrange(boxes, latest.current.edges).then((places) => {
      if (stale) return;
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
