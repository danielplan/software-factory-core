// What the person adds, drawn on the board's viewport: their drawings (a
// mark that started on a thing is drawn from that thing's corner, so it
// moves with it), their notes and links, and the one-line box where a note
// is typed. And the pen / note tool: a layer over the board that catches
// the pen or the click while the tool is on.

import { Panel, ViewportPortal, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type { ThingNode } from "../nodes";
import { MineLink, MineNote, TakenIn } from "./mine-cards";
import { type Mark, type Point, useMine } from "./mine-state";

export type Tool = "pen" | "note" | null;

// A smooth line through the points.
function pathOf(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (!first) return "";
  const at = (p: Point) => `${String(p[0])} ${String(p[1])}`;
  if (rest.length === 0) return `M${at(first)}l0.1 0`;
  let d = `M${at(first)}`;
  rest.forEach((p, i) => {
    const next = rest[i + 1];
    d += next
      ? ` Q${at(p)} ${at([(p[0] + next[0]) / 2, (p[1] + next[1]) / 2])}`
      : ` L${at(p)}`;
  });
  return d;
}

// A mark's points on the board: from its thing's corner when it sticks to
// one (hidden when that thing is not on the board).
function placed(mark: Mark, nodes: ThingNode[]): Point[] | null {
  if (!mark.on) return mark.points;
  const node = nodes.find((n) => n.id === mark.on);
  if (!node) return null;
  return mark.points.map(
    ([x, y]) => [x + node.position.x, y + node.position.y] as const,
  );
}

function Stroke({
  d,
  taken = false,
}: Readonly<{ d: string; taken?: boolean }>) {
  return (
    <path
      d={d}
      fill="none"
      stroke="var(--blue)"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={taken ? 0.45 : 1}
    />
  );
}

const SVG = "pointer-events-none absolute top-0 left-0 overflow-visible";

function Marks({ nodes }: Readonly<{ nodes: ThingNode[] }>) {
  const t = useTranslation().t;
  const mine = useMine();
  const marks = mine.items.flatMap((item) => {
    if (item.kind !== "mark") return [];
    const points = placed(item, nodes);
    return points ? [{ mark: item, points }] : [];
  });
  return (
    <>
      <svg aria-hidden width={1} height={1} className={SVG}>
        {marks.map(({ mark, points }) => {
          const d = pathOf(points);
          return (
            <g key={mark.id}>
              {mine.selected === mark.id && (
                <path
                  d={d}
                  fill="none"
                  stroke="var(--blue)"
                  strokeOpacity={0.2}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <Stroke d={d} taken={mark.taken} />
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={16}
                strokeLinecap="round"
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  mine.select(mark.id);
                }}
              />
            </g>
          );
        })}
      </svg>
      {marks.map(({ mark, points }) => {
        const right = Math.max(...points.map((p) => p[0]));
        const top = Math.min(...points.map((p) => p[1]));
        const selected = mine.selected === mark.id;
        if (!mark.taken && !selected) return null;
        return (
          <span
            key={mark.id}
            style={{ left: right + 6, top: top - 12 }}
            className="nopan pointer-events-auto absolute flex items-center gap-1"
          >
            {mark.taken && <TakenIn />}
            {selected && (
              <button
                type="button"
                title={t("explore.board.mine.remove")}
                aria-label={t("explore.board.mine.remove")}
                className="grid size-5 place-items-center rounded-full bg-card text-muted-foreground shadow-[inset_0_0_0_1px_var(--line-soft)] hover:text-foreground"
                onClick={() => {
                  mine.remove(mark.id);
                }}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            )}
          </span>
        );
      })}
    </>
  );
}

// The line where a note is typed: Enter places it; leaving it with words
// places them too; Esc drops it.
function NoteBox({
  at,
  onDone,
}: Readonly<{ at: { x: number; y: number }; onDone: () => void }>) {
  const t = useTranslation().t;
  const mine = useMine();
  const box = useRef<HTMLInputElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    box.current?.focus();
  }, []);
  const place = (text: string) => {
    if (finished.current) return;
    finished.current = true;
    const words = text.trim();
    if (words) mine.add({ kind: "note", x: at.x, y: at.y, text: words }, words);
    onDone();
  };
  return (
    <input
      ref={box}
      maxLength={120}
      aria-label={t("explore.board.mine.noteLabel")}
      placeholder={t("explore.board.mine.notePlaceholder")}
      style={{ left: at.x, top: at.y, width: 240 }}
      className="nopan nodrag pointer-events-auto absolute h-9 rounded-xl border-[1.5px] border-blue bg-wash px-3 text-[13.5px] shadow-card outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-blue/25"
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          place(event.currentTarget.value);
        } else if (event.key === "Escape") {
          finished.current = true;
          onDone();
        }
      }}
      onBlur={(event) => {
        place(event.currentTarget.value);
      }}
    />
  );
}

export function MineLayer({
  nodes,
  writing,
  onWritten,
  drawing,
}: Readonly<{
  nodes: ThingNode[];
  // Where a note is being typed, on the board.
  writing: { x: number; y: number } | null;
  onWritten: () => void;
  // The mark the pen is drawing now.
  drawing: Point[] | null;
}>) {
  const mine = useMine();
  return (
    <ViewportPortal>
      <Marks nodes={nodes} />
      {drawing && (
        <svg aria-hidden width={1} height={1} className={SVG}>
          <Stroke d={pathOf(drawing)} />
        </svg>
      )}
      {mine.items.map((item) =>
        item.kind === "note" ? (
          <MineNote key={item.id} item={item} />
        ) : item.kind === "link" ? (
          <MineLink key={item.id} item={item} />
        ) : null,
      )}
      {writing && <NoteBox at={writing} onDone={onWritten} />}
    </ViewportPortal>
  );
}

// Over the board while the pen or the note tool is on: the pen draws freely
// (a mark that starts on a thing sticks to it, one on empty space stays),
// the note tool takes a click as the place of a note.
export function ToolLayer({
  tool,
  nodes,
  onDrawing,
  onNoteAt,
}: Readonly<{
  tool: Tool;
  nodes: ThingNode[];
  onDrawing: (points: Point[] | null) => void;
  onNoteAt: (at: { x: number; y: number }) => void;
}>) {
  const mine = useMine();
  const { screenToFlowPosition } = useReactFlow();
  const stroke = useRef<{ on: string | null; points: Point[] } | null>(null);
  if (!tool) return null;
  const at = (event: React.MouseEvent): Point => {
    const p = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    return [p.x, p.y];
  };
  const thingAt = ([x, y]: Point) =>
    [...nodes].reverse().find((n) => {
      const width = n.measured?.width ?? n.width ?? 0;
      const height = n.measured?.height ?? n.height ?? 0;
      return (
        x >= n.position.x &&
        x <= n.position.x + width &&
        y >= n.position.y &&
        y <= n.position.y + height
      );
    });
  return (
    <Panel
      position="top-left"
      style={{
        inset: 0,
        margin: 0,
        pointerEvents: "auto",
        touchAction: "none",
      }}
      className={cn(tool === "pen" ? "cursor-crosshair" : "cursor-text")}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        mine.select(null);
        if (tool === "note") return;
        const start = at(event);
        event.currentTarget.setPointerCapture(event.pointerId);
        stroke.current = { on: thingAt(start)?.id ?? null, points: [start] };
        onDrawing([start]);
      }}
      onClick={(event) => {
        if (tool !== "note") return;
        const place = at(event);
        onNoteAt({ x: place[0], y: place[1] });
      }}
      onPointerMove={(event) => {
        const now = stroke.current;
        if (!now) return;
        const point = at(event);
        const last = now.points[now.points.length - 1] ?? point;
        if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 2) return;
        now.points.push(point);
        onDrawing([...now.points]);
      }}
      onPointerUp={() => {
        const now = stroke.current;
        stroke.current = null;
        onDrawing(null);
        if (!now) return;
        const node = nodes.find((n) => n.id === now.on);
        const points = node
          ? now.points.map(
              ([x, y]) => [x - node.position.x, y - node.position.y] as const,
            )
          : now.points;
        mine.add({ kind: "mark", on: node?.id ?? null, points }, "");
      }}
    />
  );
}
