// The exploration's board, one real canvas: its things laid out left to
// right along their arrows (ELK), drawn live, the arrows with their short
// labels, pan and zoom on a dotted ground. A thing a person drags stays
// where they put it. Clicking a thing attaches it to what they type next,
// and clicking it again takes it off. The view fits the things when the
// board opens and when one is added, and moves to a thing the kobold points
// at. A picture pasted or dropped on it goes on the board.

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ExplorationPage } from "@/api/client";
import { cn } from "@/lib/utils";

import { useBoardDo } from "./frame";
import type { ThingNode } from "./nodes";
import { PrototypeNode } from "./prototype-node";
import { ReadingBoard } from "./reading-board";
import { readsTheBoard } from "./reading";
import {
  ChoiceNode,
  DiagramNode,
  HeardNode,
  NoteNode,
  PictureNode,
  ProblemNode,
} from "./things";
import { ownedByPerson, useBoardNodes } from "./use-board-nodes";
import { useBoardView } from "./use-board-view";
import { usePictureDrop } from "./use-picture-drop";
import { AddToolbar } from "./mine/add-toolbar";
import { type Drawing, MineLayer, type Tool, ToolLayer } from "./mine/mine-layer";
import { useMine } from "./mine/mine-state";
import { previewOf } from "./mine/preview";
import { boardState } from "./mine/variant";

const NODE_TYPES: NodeTypes = {
  problem: ProblemNode,
  heard: HeardNode,
  note: NoteNode,
  choice: ChoiceNode,
  prototype: PrototypeNode,
  diagram: DiagramNode,
  picture: PictureNode,
};

const COLOURS = {
  "--xy-background-color": "#f7f8fa",
  "--xy-background-pattern-dots-color": "#dde1ea",
  "--xy-edge-label-background-color": "#f7f8fa",
  "--xy-edge-label-color": "var(--muted-foreground)",
  "--xy-controls-button-background-color": "var(--card)",
  "--xy-controls-button-border-color": "var(--border)",
  "--xy-controls-button-color": "var(--foreground)",
} as React.CSSProperties;

type BoardProps = Readonly<{
  page: ExplorationPage;
  attached: string[];
  onPick: (id: string) => void;
}>;

export function Board(props: BoardProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

// ?state=empty: the board with nothing on it yet (made-up, chosen by the
// page address).
function shownPage(page: ExplorationPage): ExplorationPage {
  return boardState() === "empty"
    ? { ...page, board: { things: [], links: [] } }
    : page;
}

function Canvas({ page: served, attached, onPick }: BoardProps) {
  const t = useTranslation().t;
  const page = useMemo(() => shownPage(served), [served]);
  const pointed = page.talk.pointed;
  const marks = useMemo(
    () => ({ pointed: pointed?.thing ?? null, attached }),
    [pointed, attached],
  );
  const { nodes, edges, onNodesChange, arranged } = useBoardNodes(page, marks);
  // The view re-fits for what Doodle adds, not for what the person puts there.
  const onMoveStart = useBoardView(
    nodes.filter((n) => !ownedByPerson(n)),
    arranged,
    pointed,
  );
  const area = useRef<HTMLDivElement>(null);
  const point = useBoardPoint(area);
  const act = useBoardDo(page.exploration.id);
  const adding = useAdding(nodes, arranged, act, point.flowAt);
  // Pasted or dropped pictures and web addresses land at the pointer.
  const pictures = usePictureDrop(page.exploration.id, area, {
    pointer: point.pointer,
    flowAt: point.flowAt,
    onLink: adding.addLink,
  });
  return (
    <div
      ref={area}
      className={cn(
        "relative min-h-0 flex-1",
        pictures.dropping &&
          "outline-2 -outline-offset-4 outline-blue outline-dashed",
      )}
    >
      {pictures.refused && (
        <p
          role="alert"
          className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-card px-3 py-2 text-[13px] text-destructive shadow-card"
        >
          {pictures.refused}
        </p>
      )}
      {readsTheBoard(page) && (
        <ReadingBoard
          talk={page.talk}
          onTryAgain={() => {
            act("again", {});
          }}
        />
      )}
      <ReactFlow<ThingNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_event, node) => {
          act("board", {
            do: {
              act: "move",
              id: node.id,
              x: node.position.x,
              y: node.position.y,
            },
          });
        }}
        onNodeClick={(event, node) => {
          const target = event.target as Element;
          if (!target.closest("button, a, input, textarea, iframe"))
            onPick(node.id);
        }}
        onMoveStart={onMoveStart}
        onPaneClick={() => {
          adding.mine.select(null);
        }}
        onDoubleClick={adding.onDoubleClick}
        zoomOnDoubleClick={false}
        // Only the person's own things come off, by what the toolbar's
        // layer or the remove buttons do: never Doodle's.
        deleteKeyCode={null}
        nodesConnectable={false}
        edgesFocusable={false}
        minZoom={0.15}
        maxZoom={2}
        aria-label={t("explore.board.label")}
        style={COLOURS}
      >
        <Background gap={16} />
        <MineLayer
          nodes={nodes}
          writing={adding.writing}
          onWritten={adding.stopWriting}
          drawing={adding.drawing}
        />
        <ToolLayer
          tool={adding.tool}
          nodes={nodes}
          onDrawing={adding.setDrawing}
          onNoteAt={adding.writeAt}
          onSketchAt={adding.placeSketch}
        />
        <Controls showInteractive={false} position="bottom-left" />
        <AddToolbar
          tool={adding.tool}
          onTool={adding.setTool}
          onPicture={pictures.choose}
          onLink={adding.addLink}
        />
      </ReactFlow>
    </div>
  );
}

// What the toolbar does: the tool that is on (the pen or the note), the
// note being typed (also from a double-click on empty space), the mark
// being drawn, a pasted web address, the Delete key for what is the
// person's, and Esc to leave a tool. Doodle hears of a placed thing in the
// chat.
function useAdding(
  nodes: ThingNode[],
  arranged: number,
  act: ReturnType<typeof useBoardDo>,
  flowAt: (client: Client | null) => { x: number; y: number },
) {
  const mine = useMine();
  const { screenToFlowPosition } = useReactFlow();
  const [tool, setTool] = useState<Tool>(null);
  const [writing, setWriting] = useState<{ x: number; y: number } | null>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const { seed, seeded } = mine;

  // The made-up drawing and note, taken in already, once the board is laid out.
  useEffect(() => {
    if (arranged > 0 && !seeded) seed(nodes);
  }, [arranged, seeded, seed, nodes]);

  const writeAt = (at: { x: number; y: number }) => {
    setTool(null);
    setWriting(at);
  };
  // An empty sketch card where the person clicked, and the pen to draw in it.
  const placeSketch = (at: { x: number; y: number }) => {
    const width = 320;
    const height = 220;
    const id = mine.add(
      {
        kind: "sketch",
        x: at.x - width / 2,
        y: at.y - height / 2,
        fixed: { width, height },
      },
      null,
    );
    mine.select(id);
    setTool("pen");
  };
  // A link card at the pointer, or in the middle of the view.
  const addLink = (address: string, client: Client | null = null) => {
    const at = flowAt(client);
    const more = client
      ? 0
      : mine.items.filter((one) => one.kind === "link").length % 5;
    mine.add(
      {
        kind: "link",
        url: address,
        x: at.x - 140 + more * 28,
        y: at.y - 40 + more * 28,
      },
      previewOf(address).site,
    );
  };

  useEffect(() => {
    const typing = (event: Event) =>
      event.target instanceof HTMLElement &&
      event.target.matches("input, textarea, [contenteditable]");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTool(null);
        setWriting(null);
        return;
      }
      if ((event.key !== "Delete" && event.key !== "Backspace") || typing(event))
        return;
      if (mine.selected) {
        event.preventDefault();
        mine.remove(mine.selected);
        return;
      }
      // A picture the person put there, selected on the board.
      const picked = nodes.find(
        (n) =>
          n.selected &&
          n.data.thing.by === "person" &&
          n.data.thing.kind === "picture",
      );
      if (picked) act("board", { do: { act: "remove", id: picked.id } });
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  return {
    mine,
    tool,
    setTool,
    writing,
    stopWriting: () => {
      setWriting(null);
    },
    writeAt,
    placeSketch,
    drawing,
    setDrawing,
    addLink,
    onDoubleClick: (event: React.MouseEvent) => {
      if (!(event.target as Element).classList.contains("react-flow__pane"))
        return;
      setTool(null);
      writeAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
  };
}

type Client = { x: number; y: number };

// Where the pointer is on the board (null when it is off the board), and how
// a point on the screen becomes one on the board: the pointer's, or the
// middle of the view when it is off.
function useBoardPoint(area: React.RefObject<HTMLDivElement | null>) {
  const { screenToFlowPosition } = useReactFlow();
  const pointer = useRef<Client | null>(null);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const move = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    const leave = () => {
      pointer.current = null;
    };
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    return () => {
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
    };
  }, [area]);
  const flowAt = (client: Client | null) => {
    const box = area.current?.getBoundingClientRect();
    return screenToFlowPosition(
      client ??
        (box
          ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
          : { x: 0, y: 0 }),
    );
  };
  return { pointer, flowAt };
}
