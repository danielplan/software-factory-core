// The product's parts as a real map: each part a box on a canvas, laid out
// left to right with ELK (the same layout as an exploration's board), and a
// line from each part to exactly the parts that need it (its type tag in
// type-tag.tsx). Pointing at a part
// brings out its own lines and the parts at their other ends. On a narrow
// screen (a phone) the map runs top to bottom instead, so the boxes keep a
// size that can be read. Each box has a
// tag right after its name, on the same line, saying what type of part it is;
// pointing at the tag, focusing it or tapping it tells what that type means.

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
  useUpdateNodeInternals,
} from "@xyflow/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { PartView } from "@/api/client";
import { arrange } from "@/lib/layout";
import { type Line, linesOf, nearOf } from "./system-map-lines";
import { cn } from "@/lib/utils";

import { PartCard } from "./part-card";
import { TypeTag } from "./type-tag";

type PartData = {
  part: PartView;
  onPress: (path: string) => void;
  // Dimmed while another part, not joined to it, is pointed at.
  faded: boolean;
  // Hidden until the layout has placed it, so it does not jump.
  placed: boolean;
  // The map runs top to bottom: lines come in above and leave below.
  down: boolean;
};
type PartNode = Node<PartData, "part">;

const WIDTH = 248;
// Narrower than this, the map runs top to bottom: two boxes side by side
// with room between them.
const NARROW = 600;

const COLOURS = {
  "--xy-background-color": "transparent",
  "--xy-edge-stroke-default": "var(--arrow)",
  "--xy-edge-stroke-width-default": "1.5",
} as React.CSSProperties;

const HANDLE = "!size-1.5 !min-h-0 !min-w-0 !border-0 !bg-arrow";

function PartBox({ id, data }: NodeProps<PartNode>) {
  // The lines meet the box on other sides when the map turns, so React Flow
  // measures where they meet again.
  const update = useUpdateNodeInternals();
  useEffect(() => {
    update(id);
  }, [id, data.down, update]);
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
        position={data.down ? Position.Top : Position.Left}
        isConnectable={false}
        className={HANDLE}
      />
      <PartCard
        part={data.part}
        onPress={data.onPress}
        tag={data.part.type && <TypeTag type={data.part.type} />}
      />
      <Handle
        type="source"
        position={data.down ? Position.Bottom : Position.Right}
        isConnectable={false}
        className={HANDLE}
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
  const t = useTranslation().t;
  const [pointed, setPointed] = useState<string | null>(null);
  const [frame, down] = useNarrow();
  const lines = useMemo(() => linesOf(parts), [parts]);
  const edges = useEdges(lines, pointed);
  const { nodes, onNodesChange, height } = useLaidOut(parts, lines, {
    pointed,
    onPress,
    down,
    frame,
  });

  return (
    <div className="grid gap-2">
      <div
        ref={frame}
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
          aria-label={t("system.mapLabel")}
          style={COLOURS}
        />
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {t("system.mapLegend")}
      </p>
    </div>
  );
}

// The pointed part's own lines stand out, the others fade; each arrow is
// at the part that needs the other.
function useEdges(lines: Line[], pointed: string | null): Edge[] {
  return useMemo(
    () =>
      lines.map((line) => {
        const lit = line.source === pointed || line.target === pointed;
        const colour = lit ? "var(--primary)" : "var(--arrow)";
        return {
          ...line,
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
    [lines, pointed],
  );
}

// Whether the map is narrow (a phone), so it runs top to bottom; watched as
// the window changes size.
function useNarrow() {
  const frame = useRef<HTMLDivElement>(null);
  const [down, setDown] = useState(false);
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const watch = new ResizeObserver(([entry]) => {
      if (entry) setDown(entry.contentRect.width < NARROW);
    });
    watch.observe(element);
    return () => {
      watch.disconnect();
    };
  }, []);
  return [frame, down] as const;
}

// The parts' boxes, faded when away from the pointed one, laid out once
// every box is measured, and again when a part comes, goes, changes size or
// needs something else; and the map's height to hold them.
function useLaidOut(
  parts: PartView[],
  lines: Line[],
  {
    pointed,
    onPress,
    down,
    frame,
  }: {
    pointed: string | null;
    onPress: (path: string) => void;
    down: boolean;
    frame: React.RefObject<HTMLDivElement | null>;
  },
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PartNode>([]);
  const [height, setHeight] = useState(320);
  const flow = useReactFlow();
  const near = useMemo(() => nearOf(lines, pointed), [lines, pointed]);

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
            down,
          },
        };
      });
    });
  }, [parts, onPress, near, down, setNodes]);

  const latest = useRef({ nodes, lines });
  useLayoutEffect(() => {
    latest.current = { nodes, lines };
  });
  const measured =
    nodes.length > 0 && nodes.every((n) => n.measured?.height !== undefined);
  const shape = shapeOf(nodes, lines, down);
  useEffect(() => {
    if (!measured) return;
    let stale = false;
    const boxes = latest.current.nodes.map((n) => ({
      id: n.id,
      width: n.measured?.width ?? WIDTH,
      height: n.measured?.height ?? 0,
    }));
    void arrange(boxes, latest.current.lines, down ? "DOWN" : "RIGHT").then(
      (places) => {
        if (stale) return;
        setHeight(heightOf(boxes, places, down, frame.current?.clientWidth));
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
      },
    );
    return () => {
      stale = true;
    };
  }, [shape, measured, down, frame, setNodes, flow]);

  return { nodes, onNodesChange, height };
}

// What the layout depends on: the boxes' heights, the lines and the way the
// map runs; laid out again when it changes.
function shapeOf(nodes: PartNode[], lines: Line[], down: boolean) {
  return [
    ...nodes.map(
      (n) => `${n.id}:${String(Math.round(n.measured?.height ?? 0))}`,
    ),
    ...lines.map((line) => line.id),
    down ? "down" : "right",
  ].join("|");
}

// The map's height to hold the laid out boxes. Top to bottom, it may be
// taller, as a phone's page scrolls, and holds the boxes once shrunk to fit
// the map's width (with the room fitView leaves around them).
function heightOf(
  boxes: { id: string; width: number; height: number }[],
  places: Map<string, { x: number; y: number }>,
  down: boolean,
  width: number | undefined,
) {
  const end = (box: (typeof boxes)[number], side: "x" | "y") =>
    (places.get(box.id)?.[side] ?? 0) + (side === "x" ? box.width : box.height);
  const right = Math.max(...boxes.map((box) => end(box, "x")));
  const bottom = Math.max(...boxes.map((box) => end(box, "y")));
  const shrink = down && width ? Math.min(1, width / (right * 1.16)) : 1;
  return Math.min(down ? 1200 : 640, Math.max(220, bottom * shrink + 48));
}
