// What the person adds, drawn on the board's viewport: their sketch cards and
// the drawings on cards (kept from the card's corner, so they move with it,
// and cut at its edges), their notes and links, and the one-line box where a
// note is typed. And the tool layer: over the board while the pen, the note
// or the sketch tool is on.

import { Panel, ViewportPortal, useReactFlow } from "@xyflow/react";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import type { ThingNode } from "../nodes";
import { MineLink, MineNote, TakenIn } from "./mine-cards";
import { type Point, useMine } from "./mine-state";
import { SketchCard } from "./sketch";
import {
  type Box,
  type Drawing,
  type Target,
  targetAt,
  targetsOf,
} from "./targets";
import { startVariant } from "./variant";

export type Tool = "pen" | "note" | "sketch" | null;
export type { Drawing };

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

// A drawing's points on the board, from its card's corner, with the box to
// cut them to (nothing when that card is not on the board).
function placed(drawing: Drawing, targets: Target[]) {
  const target = targets.find((t) => t.id === drawing.on);
  if (!target) return null;
  return {
    box: target.box,
    points: drawing.points.map(
      ([x, y]) => [x + target.ox, y + target.oy] as const,
    ),
  };
}

// Everything inside it is cut at the card's edges.
function Clip({ id, box }: Readonly<{ id: string; box: Box }>) {
  return (
    <clipPath id={id}>
      <rect x={box.x} y={box.y} width={box.width} height={box.height} />
    </clipPath>
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

function Marks({ targets }: Readonly<{ targets: Target[] }>) {
  const t = useTranslation().t;
  const mine = useMine();
  const marks = mine.items.flatMap((item) => {
    if (item.kind !== "mark") return [];
    const there = placed(item, targets);
    return there ? [{ mark: item, ...there }] : [];
  });
  return (
    <>
      <svg aria-hidden width={1} height={1} className={SVG}>
        {marks.map(({ mark, points, box }) => {
          const d = pathOf(points);
          const clip = `clip-${mark.id}`;
          return (
            <g key={mark.id}>
              <Clip id={clip} box={box} />
              <g clipPath={`url(#${clip})`}>
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
            </g>
          );
        })}
      </svg>
      {marks.map(({ mark, box }) => {
        const selected = mine.selected === mark.id;
        if (!mark.taken && !selected) return null;
        return (
          <span
            key={mark.id}
            style={{ left: box.x + box.width - 4, top: box.y - 12 }}
            className="nopan pointer-events-auto absolute flex -translate-x-full items-center gap-1"
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

function Drawn({
  drawing,
  targets,
}: Readonly<{ drawing: Drawing; targets: Target[] }>) {
  const there = placed(
    {
      on: drawing.on,
      // Held from the corner of the card, as the saved ones are.
      points: drawing.points.map(([x, y]) => {
        const target = targets.find((t) => t.id === drawing.on);
        return [x - (target?.ox ?? 0), y - (target?.oy ?? 0)] as const;
      }),
    },
    targets,
  );
  if (!there) return null;
  return (
    <svg aria-hidden width={1} height={1} className={SVG}>
      <Clip id="clip-drawing" box={there.box} />
      <g clipPath="url(#clip-drawing)">
        <Stroke d={pathOf(there.points)} />
      </g>
    </svg>
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
  // The mark the pen is drawing now, cut at its card's edges.
  drawing: Drawing | null;
}>) {
  const mine = useMine();
  const targets = targetsOf(nodes, mine.items, drawing);
  return (
    <ViewportPortal>
      {mine.items.map((item) => {
        const target = targets.find((t) => t.id === item.id);
        return item.kind === "sketch" && target ? (
          <SketchCard key={item.id} item={item} target={target} />
        ) : null;
      })}
      <Marks targets={targets} />
      {drawing && <Drawn drawing={drawing} targets={targets} />}
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

// Over the board while the pen, the note or the sketch tool is on. The pen
// draws inside a card: the card under it is lit, a stroke that starts on it
// is cut at its edges and moves with it. On empty space, variant A opens a
// new sketch card around the stroke (it grows as the stroke does; strokes
// that start inside it join it), and variant B draws nothing (the cursor
// says so, with a short hint: place a sketch card with the Sketch tool). The
// note tool takes a click as the place of a note, the sketch tool as the
// place of an empty sketch card.
export function ToolLayer({
  tool,
  nodes,
  onDrawing,
  onNoteAt,
  onSketchAt,
}: Readonly<{
  tool: Tool;
  nodes: ThingNode[];
  onDrawing: (drawing: Drawing | null) => void;
  onNoteAt: (at: { x: number; y: number }) => void;
  onSketchAt: (at: { x: number; y: number }) => void;
}>) {
  const t = useTranslation().t;
  const mine = useMine();
  const open = startVariant() === "A";
  const { screenToFlowPosition } = useReactFlow();
  const stroke = useRef<Drawing | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!hint) return;
    const timer = setTimeout(() => {
      setHint(null);
    }, 1600);
    return () => {
      clearTimeout(timer);
    };
  }, [hint]);
  useEffect(() => {
    if (tool !== "pen") setOver(null);
  }, [tool]);
  if (!tool) return null;
  const at = (event: React.MouseEvent): Point => {
    const p = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    return [p.x, p.y];
  };
  const targets = targetsOf(nodes, mine.items, null);
  const lit =
    tool === "pen" && over ? targets.find((one) => one.id === over) : null;
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
        className={cn(
          tool === "note" && "cursor-text",
          tool === "sketch" && "cursor-copy",
          tool === "pen" &&
            (over || open ? "cursor-crosshair" : "cursor-not-allowed"),
        )}
        onPointerDown={(event) => {
          if (event.button !== 0 || tool !== "pen") return;
          mine.select(null);
          const start = at(event);
          let on = targetAt(targets, start)?.id;
          if (!on && open) {
            // A stroke on empty space opens a card of its own around it.
            on = mine.add(
              { kind: "sketch", x: start[0], y: start[1], fixed: null },
              null,
            );
          }
          if (!on) {
            const area = event.currentTarget.getBoundingClientRect();
            setHint({
              x: event.clientX - area.left,
              y: event.clientY - area.top,
            });
            return;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
          stroke.current = { on, points: [start] };
          onDrawing({ on, points: [start] });
        }}
        onClick={(event) => {
          const place = at(event);
          if (tool === "note") onNoteAt({ x: place[0], y: place[1] });
          if (tool === "sketch") onSketchAt({ x: place[0], y: place[1] });
        }}
        onPointerMove={(event) => {
          if (tool !== "pen") return;
          const now = stroke.current;
          const point = at(event);
          if (!now) {
            setOver(targetAt(targets, point)?.id ?? null);
            return;
          }
          const last = now.points[now.points.length - 1] ?? point;
          if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 2) return;
          now.points.push(point);
          onDrawing({ on: now.on, points: [...now.points] });
        }}
        onPointerLeave={() => {
          if (!stroke.current) setOver(null);
        }}
        onPointerUp={(event) => {
          const now = stroke.current;
          stroke.current = null;
          onDrawing(null);
          if (!now) return;
          const target = targets.find((one) => one.id === now.on);
          if (!target) return;
          // A click that drew nothing leaves no new card behind.
          const empty =
            now.points.length < 3 &&
            target.sketch &&
            !mine.items.some((one) => one.kind === "mark" && one.on === now.on);
          if (empty) {
            mine.remove(now.on);
            return;
          }
          // Kept from the card's corner, so it moves with the card.
          const points = now.points.map(
            ([x, y]) => [x - target.ox, y - target.oy] as const,
          );
          mine.add({ kind: "mark", on: now.on, points }, "");
          setOver(targetAt(targets, at(event))?.id ?? null);
        }}
      >
        {hint && (
          <span
            role="status"
            style={{ left: hint.x + 14, top: hint.y + 14 }}
            className="pointer-events-none absolute rounded-lg bg-foreground px-2.5 py-1 text-[12px] font-medium whitespace-nowrap text-background shadow-card"
          >
            {t("explore.board.mine.drawOnCard")}
          </span>
        )}
      </Panel>
    </>
  );
}
