// The exploration's board, one real canvas: its things laid out left to
// right along their arrows (ELK), drawn live, the arrows with their short
// labels, pan and zoom on a dotted ground. A thing a person drags stays
// where they put it. Clicking a thing attaches it to what they type next,
// and clicking it again takes it off. The view fits the things when the
// board opens and when one is added, and moves to a thing the kobold points
// at. The toolbar at its foot adds the team's own things: pen, note,
// picture and link (mine/); a picture or a web address pasted or dropped on
// it goes on the board too, where the pointer is. What the team adds never
// moves the view.

import "@xyflow/react/dist/style.css";

import {
  Background,
  Controls,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { ExplorationPage } from "@/api/client";
import { cn } from "@/lib/utils";

import { useBoardDo } from "./frame";
import { ownedByPerson, type ThingNode } from "./nodes";
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
import { AddToolbar } from "./mine/add-toolbar";
import { MineLayer } from "./mine/mine-layer";
import { MineProvider } from "./mine/mine-state";
import { ToolLayer } from "./mine/tool-layer";
import { useAdding, useBoardPoint } from "./use-adding";
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
      <MineProvider
        exploration={props.page.exploration.id}
        things={props.page.board.things}
      >
        <Canvas {...props} />
      </MineProvider>
    </ReactFlowProvider>
  );
}

function Canvas({ page, attached, onPick }: BoardProps) {
  const t = useTranslation().t;
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
  const adding = useAdding(nodes, act, point.flowAt);
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
      {pictures.refused && <Refused words={pictures.refused} />}
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
        onPaneClick={adding.deselect}
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
        <Tools nodes={nodes} adding={adding} pictures={pictures} />
      </ReactFlow>
    </div>
  );
}

// What the team adds with: the layer their things are drawn on, the pen's and
// note's layer over the board, the floating toolbar, and the zoom buttons.
function Tools({
  nodes,
  adding,
  pictures,
}: Readonly<{
  nodes: ThingNode[];
  adding: ReturnType<typeof useAdding>;
  pictures: ReturnType<typeof usePictureDrop>;
}>) {
  return (
    <>
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
      />
      <Controls showInteractive={false} position="bottom-left" />
      <AddToolbar
        tool={adding.tool}
        onTool={adding.setTool}
        onPicture={pictures.choose}
        onLink={adding.addLink}
      />
    </>
  );
}

// Why what was dropped or pasted could not go on the board, for a few
// seconds.
function Refused({ words }: Readonly<{ words: string }>) {
  return (
    <p
      role="alert"
      className="absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-xl bg-card px-3 py-2 text-[13px] text-destructive shadow-card"
    >
      {words}
    </p>
  );
}
