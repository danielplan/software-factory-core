// The product's parts as a real map: each part a box on a canvas, laid out
// left to right with ELK (the same layout as an exploration's board), and a
// line from each part to exactly the parts it needs. Pointing at a part
// brings out its own lines and the parts at their other ends.
// Prototype: a first try of a clearer System map.

import "@xyflow/react/dist/style.css";

import {
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { PartView } from "@/api";
import { arrange } from "@/explorations/board/layout";
import { cn } from "@/lib/utils";

import { PartCard } from "./part-card";

type PartData = {
  part: PartView;
  onPress: (path: string) => void;
  // Dimmed while another part, not joined to it, is pointed at.
  faded: boolean;
  placed: boolean;
};
type PartNode = Node<PartData, "part">;

const WIDTH = 248;

const COLOURS = {
  "--xy-background-color": "transparent",
  "--xy-edge-stroke-default": "var(--arrow)",
  "--xy-edge-stroke-width-default": "1.5",
} as React.CSSProperties;

function PartBox({ data }: NodeProps<PartNode>) {
  return (
    <div
      style={{ width: WIDTH }}
      className={cn(
        "nodrag cursor-default transition-opacity",
        !data.placed && "invisible",
        data.faded && "opacity-35",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-1.5 !min-h-0 !min-w-0 !border-0 !bg-arrow"
      />
      <PartCard part={data.part} onPress={data.onPress} />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-1.5 !min-h-0 !min-w-0 !border-0 !bg-arrow"
      />
    </div>
  );
}

const NODE_TYPES = { part: PartBox };

export function SystemMap(
  props: Readonly<{ parts: PartView[]; onPress: (path: string) => void }>,
) {
  return (
    <ReactFlowProvider>
      <PartsMap {...props} />
    </ReactFlowProvider>
  );
}

function PartsMap({
  parts,
  onPress,
}: Readonly<{ parts: PartView[]; onPress: (path: string) => void }>) {
  const [pointed, setPointed] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<PartNode>([]);
  const [height, setHeight] = useState(320);
  const flow = useReactFlow();

  // A line from the part needed to the part that needs it, its arrow at the
  // part that needs it: the map reads left to right, from what comes first.
  const edges = useMemo<Edge[]>(() => {
    const known = new Set(parts.map((part) => part.id));
    const joined = (edge: { source: string; target: string }) =>
      pointed !== null && (edge.source === pointed || edge.target === pointed);
    return parts.flatMap((part) =>
      part.dependsOn
        .filter((needed) => known.has(needed))
        .map((needed) => {
          const edge = { source: needed, target: part.id };
          const lit = joined(edge);
          const colour = lit ? "var(--primary)" : "var(--arrow)";
          return {
            ...edge,
            id: `${needed}>${part.id}`,
            type: "smoothstep",
            pathOptions: { borderRadius: 12 },
            zIndex: lit ? 1 : 0,
            style: {
              stroke: colour,
              strokeWidth: lit ? 2 : 1.5,
              opacity: pointed !== null && !lit ? 0.25 : 1,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: colour,
              width: 16,
              height: 16,
            },
          };
        }),
    );
  }, [parts, pointed]);

  // The parts joined to the pointed one, and the pointed one itself.
  const near = useMemo(() => {
    if (pointed === null) return null;
    const ids = new Set([pointed]);
    for (const edge of edges) {
      if (edge.source === pointed) ids.add(edge.target);
      if (edge.target === pointed) ids.add(edge.source);
    }
    return ids;
  }, [edges, pointed]);

  useEffect(() => {
    setNodes((earlier) => {
      const before = new Map(earlier.map((n) => [n.id, n]));
      return parts.map((part) => {
        const old = before.get(part.id);
        return {
          id: part.id,
          type: "part" as const,
          position: old?.position ?? { x: 0, y: 0 },
          ...(old?.measured ? { measured: old.measured } : {}),
          draggable: false,
          data: {
            part,
            onPress,
            faded: near !== null && !near.has(part.id),
            placed: old?.data.placed ?? false,
          },
        };
      });
    });
  }, [parts, onPress, near, setNodes]);

  // Lay the map out once every box is measured, and again when a part
  // comes, goes, changes size or needs something else.
  const latest = useRef({ nodes, edges });
  useLayoutEffect(() => {
    latest.current = { nodes, edges };
  });
  const measured =
    nodes.length > 0 && nodes.every((n) => n.measured?.height !== undefined);
  const shape = [
    ...nodes.map(
      (n) => `${n.id}:${String(Math.round(n.measured?.height ?? 0))}`,
    ),
    ...edges.map((e) => e.id),
  ].join("|");
  useEffect(() => {
    if (!measured) return;
    let stale = false;
    const boxes = latest.current.nodes.map((n) => ({
      id: n.id,
      width: n.measured?.width ?? WIDTH,
      height: n.measured?.height ?? 0,
    }));
    void arrange(boxes, latest.current.edges).then((places) => {
      if (stale) return;
      const bottom = Math.max(
        ...boxes.map((box) => (places.get(box.id)?.y ?? 0) + box.height),
      );
      setHeight(Math.min(640, Math.max(220, bottom + 48)));
      setNodes((now) =>
        now.map((n) => ({
          ...n,
          position: places.get(n.id) ?? n.position,
          data: { ...n.data, placed: true },
        })),
      );
      requestAnimationFrame(() => {
        void flow.fitView({ padding: 0.08, maxZoom: 1 });
      });
    });
    return () => {
      stale = true;
    };
  }, [shape, measured, setNodes, flow]);

  return (
    <div className="grid gap-2">
      <div
        style={{ height }}
        className="overflow-hidden rounded-xl border border-border-soft bg-[radial-gradient(#dde1ea_1px,transparent_1px)] [background-size:16px_16px]"
      >
        <ReactFlow<PartNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onNodeMouseEnter={(_event, node) => {
            setPointed(node.id);
          }}
          onNodeMouseLeave={() => {
            setPointed(null);
          }}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          edgesFocusable={false}
          zoomOnScroll={false}
          preventScrolling={false}
          panOnDrag
          minZoom={0.4}
          maxZoom={1}
          aria-label="How the parts connect"
          style={COLOURS}
        />
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        Each line joins a part to a part that needs it, its arrow at the one
        that needs it. Point at a part to see only its lines.
      </p>
    </div>
  );
}
