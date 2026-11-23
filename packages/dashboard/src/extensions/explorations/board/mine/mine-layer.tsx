// What the team put on the board, drawn on the board's viewport: their
// sketch cards and the marks on cards (kept from the card's corner, so they
// move with it, and cut at its edges), their notes and links, and the
// one-line box where a note is typed.

import { ViewportPortal } from "@xyflow/react";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import type { ThingNode } from "../nodes";
import { pathOf } from "./draw";
import { PENDING } from "./held";
import { MineLink, MineNote, RemoveChip } from "./mine-cards";
import { useMine } from "./mine-state";
import {
  type Box,
  type Drawing,
  type Mark,
  type Target,
  targetsOf,
} from "./own";
import { SketchCard } from "./sketch";
import { TakenIn } from "./tags";

// The marks of a card on the board, with the box to cut them to (nothing
// when that card is not on the board).
function placed(on: string, points: Mark["points"], targets: Target[]) {
  const target = targets.find((t) => t.id === on);
  if (!target) return null;
  return {
    box: target.box,
    points: points.map(([x, y]) => [x + target.ox, y + target.oy] as const),
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
  const mine = useMine();
  const marks = mine.own.marks.flatMap((mark) => {
    const there = placed(mark.on, mark.points, targets);
    return there ? [{ mark, ...there }] : [];
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
                <Stroke d={d} taken={mark.taken === true} />
                {!mark.id.startsWith(PENDING) && (
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
                )}
              </g>
            </g>
          );
        })}
      </svg>
      {marks.map(({ mark, box }) => {
        const selected = mine.selected === mark.id;
        if (mark.taken !== true && !selected) return null;
        return (
          <span
            key={mark.id}
            style={{ left: box.x + box.width - 4, top: box.y - 12 }}
            className="nopan pointer-events-auto absolute flex -translate-x-full items-center gap-1 rounded-full bg-card/90"
          >
            {mark.taken === true && <TakenIn />}
            {selected && (
              <RemoveChip
                onRemove={() => {
                  mine.erase(mark.id);
                }}
              />
            )}
          </span>
        );
      })}
    </>
  );
}

// The stroke being drawn now, cut at its card's edges.
function Drawn({
  drawing,
  targets,
}: Readonly<{ drawing: Drawing; targets: Target[] }>) {
  const target = targets.find((t) => t.id === drawing.on);
  const there = placed(
    drawing.on,
    // Held from the corner of the card, as the saved ones are.
    drawing.points.map(([x, y]) => [
      x - (target?.ox ?? 0),
      y - (target?.oy ?? 0),
    ]),
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
    if (words) mine.note(words, at);
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
  // The stroke the pen is drawing now, cut at its card's edges.
  drawing: Drawing | null;
}>) {
  const mine = useMine();
  const { see } = mine;
  const { own } = mine;
  const targets = useMemo(
    () => targetsOf(nodes, own, drawing),
    [nodes, own, drawing],
  );
  useEffect(() => {
    see(targets);
  }, [see, targets]);
  return (
    <ViewportPortal>
      {mine.own.sketches.map((card) => {
        const target = targets.find((t) => t.id === card.id);
        return target ? (
          <SketchCard key={card.id} item={card} target={target} />
        ) : null;
      })}
      <Marks targets={targets} />
      {drawing && <Drawn drawing={drawing} targets={targets} />}
      {mine.own.notes.map((item) => (
        <MineNote key={item.id} item={item} />
      ))}
      {mine.own.links.map((item) => (
        <MineLink key={item.id} item={item} />
      ))}
      {writing && <NoteBox at={writing} onDone={onWritten} />}
    </ViewportPortal>
  );
}
