// The product's parts as a real map: each part a box on a canvas, laid out
// left to right with ELK (the same layout as an exploration's board), and a
// line from each part to exactly the parts that need it. Pointing at a part
// brings out its own lines and the parts at their other ends. Each box has a
// tag on a small line above its name saying what type of part it is;
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
} from "@xyflow/react";
import {
  Cloud,
  Database,
  type LucideIcon,
  Monitor,
  Server,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { PartView } from "@/api";
import { arrange } from "@/explorations/board/layout";
import { type Line, linesOf, nearOf, TYPES } from "@/lib/system-map";
import { cn } from "@/lib/utils";

import { PartCard } from "./part-card";

type PartType = NonNullable<PartView["type"]>;

type PartData = {
  part: PartView;
  onPress: (path: string) => void;
  // Dimmed while another part, not joined to it, is pointed at.
  faded: boolean;
  // Hidden until the layout has placed it, so it does not jump.
  placed: boolean;
};
type PartNode = Node<PartData, "part">;

const WIDTH = 248;

const COLOURS = {
  "--xy-background-color": "transparent",
  "--xy-edge-stroke-default": "var(--arrow)",
  "--xy-edge-stroke-width-default": "1.5",
} as React.CSSProperties;

// Each type's icon and colours on its tag.
const LOOK: Record<PartType, { icon: LucideIcon; look: string }> = {
  screen: { icon: Monitor, look: "bg-sky-50 text-sky-700 ring-sky-200" },
  backend: {
    icon: Server,
    look: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  data: { icon: Database, look: "bg-amber-50 text-amber-800 ring-amber-200" },
  outside: { icon: Cloud, look: "bg-rose-50 text-rose-700 ring-rose-200" },
};

const HANDLE = "!size-1.5 !min-h-0 !min-w-0 !border-0 !bg-arrow";

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
        className={HANDLE}
      />
      <PartCard
        part={data.part}
        onPress={data.onPress}
        tag={data.part.type && <TypeTag type={data.part.type} />}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className={HANDLE}
      />
    </div>
  );
}

// A small coloured tag saying what type of part it is. Pointing at it,
// focusing it or tapping it tells what that type means; only this tag's.
function TypeTag({ type }: Readonly<{ type: PartType }>) {
  const { label, means } = TYPES[type];
  const { icon: Icon, look } = LOOK[type];
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        // Not the box's own hint (what the part does), only this tag's.
        title=""
        aria-label={`${label}: ${means}`}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        // A tap (or click) opens it rather than toggling it, since the
        // focus that comes with it has opened it already.
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 cursor-help items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium ring-1 outline-none focus-visible:ring-2",
          look,
        )}
      >
        <Icon className="size-3" aria-hidden />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          // The tag keeps the focus; the hint only tells.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          className="z-50 max-w-56 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md"
        >
          <span className="font-medium">{label}</span>: {means}
          <Popover.Arrow className="fill-foreground" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
  const lines = useMemo(() => linesOf(parts), [parts]);
  const edges = useEdges(lines, pointed);
  const { nodes, onNodesChange, height } = useLaidOut(
    parts,
    lines,
    pointed,
    onPress,
  );

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

// The parts' boxes, faded when away from the pointed one, laid out once
// every box is measured, and again when a part comes, goes, changes size or
// needs something else; and the map's height to hold them.
function useLaidOut(
  parts: PartView[],
  lines: Line[],
  pointed: string | null,
  onPress: (path: string) => void,
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
          },
        };
      });
    });
  }, [parts, onPress, near, setNodes]);

  const latest = useRef({ nodes, lines });
  useLayoutEffect(() => {
    latest.current = { nodes, lines };
  });
  const measured =
    nodes.length > 0 && nodes.every((n) => n.measured?.height !== undefined);
  const shape = [
    ...nodes.map(
      (n) => `${n.id}:${String(Math.round(n.measured?.height ?? 0))}`,
    ),
    ...lines.map((line) => line.id),
  ].join("|");
  useEffect(() => {
    if (!measured) return;
    let stale = false;
    const boxes = latest.current.nodes.map((n) => ({
      id: n.id,
      width: n.measured?.width ?? WIDTH,
      height: n.measured?.height ?? 0,
    }));
    void arrange(boxes, latest.current.lines).then((places) => {
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

  return { nodes, onNodesChange, height };
}
