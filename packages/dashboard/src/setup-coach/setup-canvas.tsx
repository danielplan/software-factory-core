import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
} from "@xyflow/react";
import {
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { type Draft, messageOf, post } from "@/api";

import {
  CanvasChange,
  edgesOf,
  nodesOf,
  type PieceNode,
  type RouteEdge,
  shapeOf,
} from "./canvas";
import { type Arrangement, arrange, type Box, type Point } from "./layout";
import { PieceNodeView } from "./piece-node";
import { RouteEdgeView } from "./route-edge";
import { useView, WholeCanvas } from "./view";

const NODE_TYPES: NodeTypes = { piece: PieceNodeView };
const EDGE_TYPES: EdgeTypes = { route: RouteEdgeView };

// The canvas in the dashboard's own colours, light and dark.
const COLOURS = {
  // The page's gradient shows through the canvas.
  "--xy-background-color": "transparent",
  "--xy-attribution-background-color": "transparent",
  "--xy-edge-stroke": "var(--arrow)",
  "--xy-edge-label-background-color": "var(--surface)",
  "--xy-edge-label-color": "var(--muted-foreground)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-border-color": "var(--border)",
  "--xy-controls-button-color": "var(--foreground)",
  "--xy-background-pattern-dots-color": "var(--dot)",
} as React.CSSProperties;

// The project as the coach drafts it while they talk, on one canvas filling
// its place: the project, small cards framed in areas and joined by
// arrows, and what to install. Every card can be moved or taken off by
// hand, and clicked to ask about it; a refused change goes to onProblem.
export function SetupCanvas({
  draft,
  attached,
  onPick,
  onProblem,
}: Readonly<{
  draft: Draft;
  attached: string[];
  onPick: (id: string) => void;
  onProblem: (problem: string | null) => void;
}>) {
  const change = useMemo(
    () => (body: unknown) => {
      onProblem(null);
      post("/api/setup/draft", body).catch((error: unknown) => {
        onProblem(messageOf(error));
      });
    },
    [onProblem],
  );
  return (
    <CanvasChange value={change}>
      <ReactFlowProvider>
        <Canvas draft={draft} attached={attached} onPick={onPick} />
      </ReactFlowProvider>
    </CanvasChange>
  );
}

function Canvas({
  draft,
  attached,
  onPick,
}: Readonly<{
  draft: Draft;
  attached: string[];
  onPick: (id: string) => void;
}>) {
  const change = use(CanvasChange);
  const { nodes, edges, onNodesChange } = useArranged(draft, attached);
  return (
    <ReactFlow<PieceNode, RouteEdge>
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      onNodesChange={onNodesChange}
      onNodeDragStop={(_event, node) => {
        change({
          move: { id: node.id, x: node.position.x, y: node.position.y },
        });
      }}
      onNodeClick={(event, node) => {
        // A piece's own buttons and fields do their job, and an area's
        // title is only a title; they do not attach it.
        const target = event.target as Element;
        if (node.data.piece.kind === "area") return;
        if (!target.closest("button, a, input, textarea")) onPick(node.id);
      }}
      nodesConnectable={false}
      edgesFocusable={false}
      minZoom={0.2}
      maxZoom={1.5}
      aria-label="The canvas"
      style={COLOURS}
    >
      <Background gap={22} />
      <Controls
        showInteractive={false}
        showFitView={false}
        position="bottom-right"
        className="max-lg:hidden"
        style={{ right: 420 }}
      >
        <WholeCanvas />
      </Controls>
    </ReactFlow>
  );
}

// The cards, kept in step with the draft: cards the owner placed stay
// where they are; the others are arranged (layout.ts) once each has been
// measured, and again whenever one comes, goes or changes size, or an
// arrow changes; each frame then fits its cards. The view fits the canvas
// when a card is added.
function useArranged(draft: Draft, attached: string[]) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PieceNode>([]);
  // The arrows' ways, and where their cards were then.
  const [ways, setWays] = useState(() => ({
    routes: new Map<string, Point[]>(),
    at: new Map<string, Point>(),
  }));
  // The latest cards and draft, for the arrangement below.
  const latest = useRef({ nodes, draft });
  useLayoutEffect(() => {
    latest.current = { nodes, draft };
  });
  const show = useView(draft);

  useEffect(() => {
    setNodes((earlier) => nodesOf(draft, earlier, attached));
  }, [draft, attached, setNodes]);

  const shape = shapeOf(nodes, draft);
  const cards = nodes.filter((n) => n.data.piece.kind !== "area");
  const measured =
    cards.length > 0 && cards.every((n) => n.measured?.height !== undefined);

  useEffect(() => {
    if (!measured) return;
    let stale = false;
    let frame = 0;
    const { nodes: now, draft: drawn } = latest.current;
    const boxes = now
      .filter((n) => n.data.piece.kind !== "area")
      .map((n) => ({
        id: n.id,
        ...(n.parentId ? { area: n.parentId } : {}),
        width: n.measured?.width ?? 0,
        height: n.measured?.height ?? 0,
      }));
    const arrows = drawn.links.map((l) => ({
      id: l.id,
      source: l.from,
      target: l.to,
    }));
    void arrange(boxes, arrows).then(({ places, frames, routes }) => {
      if (stale) return;
      setNodes((current) =>
        current.map((n) => arranged(n, drawn.places, places, frames)),
      );
      setWays({ routes, at: onCanvas(boxes, places, frames) });
      frame = requestAnimationFrame(() => {
        show(boxes.length);
      });
    });
    return () => {
      stale = true;
      cancelAnimationFrame(frame);
    };
  }, [shape, measured, setNodes, show]);

  const edges = useMemo(
    () => edgesOf(draft, ways.routes, ways.at),
    [draft, ways],
  );
  return { nodes, edges, onNodesChange };
}

// A piece where the owner placed it, or where it was arranged; a frame as
// big as its cards need.
function arranged(
  n: PieceNode,
  placed: Draft["places"],
  places: Arrangement["places"],
  frames: Arrangement["frames"],
): PieceNode {
  const frame = frames.get(n.id);
  return {
    ...n,
    position: placed[n.id] ?? places.get(n.id) ?? frame ?? n.position,
    ...(frame ? { width: frame.width, height: frame.height } : {}),
    data: { ...n.data, placed: true },
  };
}

// Where each card was put, on the canvas as a whole.
function onCanvas(
  boxes: Box[],
  places: Arrangement["places"],
  frames: Arrangement["frames"],
): Map<string, Point> {
  return new Map(
    boxes.flatMap((box) => {
      const place = places.get(box.id);
      if (!place) return [];
      const area = box.area ? frames.get(box.area) : undefined;
      const x = place.x + (area?.x ?? 0);
      const y = place.y + (area?.y ?? 0);
      return [[box.id, { x, y }]];
    }),
  );
}
