// Over the board while the pen or the note tool is on. The pen draws inside
// a card: the card under it is lit, a stroke that starts on it is cut at its
// edges and moves with it. On empty space a stroke opens a new sketch card
// around it (it grows as the stroke does; strokes that start inside it join
// it). The note tool takes a click as the place of a note.

import { Panel, ViewportPortal } from "@xyflow/react";

import { cn } from "@/lib/utils";

import type { ThingNode } from "../nodes";
import { useMine } from "./mine-state";
import { type Drawing, targetsOf } from "./own";
import { usePen } from "./use-pen";

export type Tool = "pen" | "note" | null;

export function ToolLayer({
  tool,
  nodes,
  onDrawing,
  onNoteAt,
}: Readonly<{
  tool: Tool;
  nodes: ThingNode[];
  onDrawing: (drawing: Drawing | null) => void;
  onNoteAt: (at: { x: number; y: number }) => void;
}>) {
  const mine = useMine();
  const targets = targetsOf(nodes, mine.own, null);
  const pen = usePen(tool === "pen", targets, onDrawing);
  if (!tool) return null;
  const lit = pen.over ? targets.find((one) => one.id === pen.over) : null;
  return (
    <>
      {lit && (
        <ViewportPortal>
          <div
            aria-hidden
            style={{
              left: lit.box.x,
              top: lit.box.y,
              width: lit.box.width,
              height: lit.box.height,
            }}
            className="pointer-events-none absolute rounded-[14px] bg-blue/5 ring-2 ring-blue"
          />
        </ViewportPortal>
      )}
      <Panel
        position="top-left"
        style={{
          inset: 0,
          margin: 0,
          pointerEvents: "auto",
          touchAction: "none",
        }}
        className={cn(tool === "note" ? "cursor-text" : "cursor-crosshair")}
        onPointerDown={pen.begin}
        onClick={(event) => {
          if (tool !== "note") return;
          const place = pen.at(event);
          onNoteAt({ x: place[0], y: place[1] });
        }}
        onPointerMove={pen.move}
        onPointerLeave={pen.leave}
        onPointerUp={pen.end}
      />
    </>
  );
}
