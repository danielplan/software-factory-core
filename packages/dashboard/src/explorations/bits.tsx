// Small pieces of the Explorations pages: persona faces in a row, and the
// small preview of a board.

import { Fragment } from "react";

import type { ExplorationRow, Face } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { columnsOf } from "./view";

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

const LOOK: Record<string, string> = {
  problem: "h-[34px] w-[58px] bg-[#fff6cf] shadow-[0_0_0_1px_#f1e3a6]",
  note: "h-[22px] w-[52px] bg-[#fff6cf] shadow-[0_0_0_1px_#f1e3a6]",
  heard: "h-[26px] w-[58px] bg-card shadow-[0_0_0_1px_var(--line-soft)]",
  choice: "h-[52px] w-[56px] bg-card shadow-[0_0_0_1px_var(--line-soft)]",
  diagram: "h-[40px] w-[64px] bg-card shadow-[0_0_0_1px_var(--line-soft)]",
  picture: "h-[34px] w-[48px] bg-[#eef0f4]",
  prototype: "h-[22px] w-12 bg-card shadow-[0_0_0_1px_var(--line-soft)]",
};

// The board in small: its things in columns along their arrows, the
// agreed ones outlined in green; a dashed box while there is nothing past
// the problem.
export function Preview({ row }: Readonly<{ row: ExplorationRow }>) {
  const columns = columnsOf(row.things, row.links);
  return (
    <div className="relative flex h-28 items-center gap-3.5 overflow-hidden rounded-xl bg-[#f7f8fa] bg-[radial-gradient(#dde1ea_1px,transparent_1px)] bg-size-[10px_10px] px-[18px]">
      {columns.map((column, at) => (
        <Fragment key={at}>
          {at > 0 && <span className="text-[#b6bccb]">→</span>}
          <div className="flex flex-col gap-1.5">
            {column.map((thing) => (
              <div
                key={thing.id}
                className={cn(
                  "rounded-[5px]",
                  LOOK[thing.kind],
                  thing.agreed && "shadow-[0_0_0_2px_#12a594]",
                )}
              />
            ))}
          </div>
        </Fragment>
      ))}
      {columns.length < 2 && (
        <>
          <span className="text-[#b6bccb]">→</span>
          <div className="h-[22px] w-12 rounded-[5px] border-[1.5px] border-dashed border-[#d3d7e0]" />
        </>
      )}
    </div>
  );
}
