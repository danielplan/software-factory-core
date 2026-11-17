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
} from "@xyflow/react";
import { useMemo, useRef } from "react";

import type { ExplorationPage } from "@/api";
import { cn } from "@/lib/utils";

import { useBoardDo } from "./frame";
import type { ThingNode } from "./nodes";
import { PrototypeNode } from "./prototype-node";
import {
  ChoiceNode,
  DiagramNode,
  HeardNode,
  NoteNode,
  PictureNode,
  ProblemNode,
} from "./things";
import { useBoardNodes } from "./use-board-nodes";
import { useBoardView } from "./use-board-view";
import { usePictureDrop } from "./use-picture-drop";

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

function Canvas({ page, attached, onPick }: BoardProps) {
  const pointed = page.talk.pointed;
  const marks = useMemo(
    () => ({ pointed: pointed?.thing ?? null, attached }),
    [pointed, attached],
  );
  const { nodes, edges, onNodesChange, arranged } = useBoardNodes(page, marks);
  const onMoveStart = useBoardView(nodes, arranged, pointed);
  const area = useRef<HTMLDivElement>(null);
  const pictures = usePictureDrop(page.exploration.id, area);
  const act = useBoardDo(page.exploration.id);
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
        nodesConnectable={false}
        edgesFocusable={false}
        minZoom={0.15}
        maxZoom={2}
        aria-label="The exploration's board"
        style={COLOURS}
      >
        <Background gap={16} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
