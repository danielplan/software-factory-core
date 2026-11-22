// Small pieces of the Explorations pages: persona faces in a row, and the
// small preview of a board, as a whiteboard.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ExplorationRow, Face } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

import { KINDS } from "./kinds";
import { spread } from "@/lib/layout";
import { areaOf } from "./view";

export function Faces({
  personas,
  size,
}: Readonly<{ personas: { id: string; face: Face }[]; size: number }>) {
  return (
    <span className="flex flex-none">
      {personas.map((one, at) => (
        <span key={one.id} style={{ marginLeft: at > 0 ? -8 : 0 }}>
          <PersonaFace face={one.face} size={size} />
        </span>
      ))}
    </span>
  );
}

// The board in small, as it really is: a whiteboard, its things where they
// belong (near what they are joined to) in their kind's colour with their
// icon and first words, the agreed ones outlined in green, the whole board
// scaled to fit; a dashed box while there is nothing past the problem.
const MINI = { width: 150, height: 40 };

export function Preview({ row }: Readonly<{ row: ExplorationRow }>) {
  const t = useTranslation().t;
  const places = useMiniPlaces(row);
  const area = areaOf([...places.values()], MINI);
  const shown = row.things.filter((thing) => places.has(thing.id));
  return (
    <div className="relative h-[132px] overflow-hidden rounded-xl bg-[#f7f8fa] bg-[radial-gradient(#dde1ea_1px,transparent_1px)] bg-size-[10px_10px]">
      {shown.length > 0 && (
        <svg
          className="size-full"
          viewBox={`${String(area.x)} ${String(area.y)} ${String(area.width)} ${String(area.height)}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {row.links.map((link) => {
            const from = places.get(link.from);
            const to = places.get(link.to);
            if (!from || !to) return null;
            return (
              <line
                key={`${link.from}>${link.to}`}
                x1={from.x + MINI.width / 2}
                y1={from.y + MINI.height / 2}
                x2={to.x + MINI.width / 2}
                y2={to.y + MINI.height / 2}
                stroke="#c4c9d4"
                strokeWidth={2}
              />
            );
          })}
          {shown.map((thing) => {
            const at = places.get(thing.id);
            return at ? (
              <foreignObject key={thing.id} x={at.x} y={at.y} {...MINI}>
                <Mini thing={thing} />
              </foreignObject>
            ) : null;
          })}
        </svg>
      )}
      {row.things.length < 2 && (
        <div className="absolute top-1/2 right-6 grid h-[38px] w-[110px] -translate-y-1/2 place-items-center rounded-lg border-[1.5px] border-dashed border-[#d3d7e0] text-[10.5px] text-faint">
          {t("explore.waysComeHere")}
        </div>
      )}
    </div>
  );
}

// Where each thing goes on the board in small: spread like the whiteboard.
function useMiniPlaces(row: ExplorationRow) {
  const [places, setPlaces] = useState(
    () => new Map<string, { x: number; y: number }>(),
  );
  const latest = useRef(row);
  useLayoutEffect(() => {
    latest.current = row;
  });
  // The shape says when things or arrows came or went.
  const shape = [
    ...row.things.map((thing) => thing.id),
    ...row.links.map((link) => `${link.from}>${link.to}`),
  ].join("|");
  useEffect(() => {
    let stale = false;
    const { things, links } = latest.current;
    void spread(
      things.map((thing) => ({ id: thing.id, ...MINI })),
      links.map((link, at) => ({
        id: String(at),
        source: link.from,
        target: link.to,
      })),
      110,
    ).then((found) => {
      if (!stale) setPlaces(found);
    });
    return () => {
      stale = true;
    };
  }, [shape]);
  return places;
}

function Mini({
  thing,
}: Readonly<{ thing: ExplorationRow["things"][number] }>) {
  const { Icon, tint } = KINDS[thing.kind];
  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-1 rounded-lg bg-card px-1.5 py-1 text-[10.5px] leading-tight shadow-[0_0_0_1px_var(--line-soft)]",
        thing.agreed && "shadow-[0_0_0_2px_#12a594]",
      )}
    >
      <span
        className={cn("grid size-4 flex-none place-items-center rounded", tint)}
      >
        <Icon aria-hidden className="size-2.5" />
      </span>
      <span className="line-clamp-2 min-w-0 text-foreground-2">
        <Markdown text={thing.label} inline />
      </span>
    </div>
  );
}
