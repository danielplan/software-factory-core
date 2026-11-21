// Small pieces of the Explorations pages: persona faces in a row, and the
// small preview of a board.

import { Fragment } from "react";

import type { ExplorationRow, Face } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { KINDS } from "./kinds";
import { columnsOf } from "./view";
import { useT } from "@/i18n/use-t";

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

// The board in small, as it really is: its things in columns along their
// arrows, each in its kind's colour with its icon and its own first words,
// the agreed ones outlined in green; a dashed box while there is nothing
// past the problem.
export function Preview({ row }: Readonly<{ row: ExplorationRow }>) {
  const columns = columnsOf(row.things, row.links);
  const t = useT().explore;
  return (
    <div className="relative flex h-[132px] items-center gap-2.5 overflow-hidden rounded-xl bg-[#f7f8fa] bg-[radial-gradient(#dde1ea_1px,transparent_1px)] bg-size-[10px_10px] px-4">
      {columns.map((column, at) => (
        <Fragment key={at}>
          {at > 0 && <span className="flex-none text-[#b6bccb]">→</span>}
          <div className="flex w-[132px] flex-none flex-col gap-1.5">
            {column.slice(0, 3).map((thing) => (
              <Mini key={thing.id} thing={thing} />
            ))}
            {column.length > 3 && (
              <span className="text-[10.5px] text-muted-foreground">
                {t.more(column.length - 3)}
              </span>
            )}
          </div>
        </Fragment>
      ))}
      {columns.length < 2 && (
        <>
          <span className="text-[#b6bccb]">→</span>
          <div className="grid h-[38px] w-[110px] flex-none place-items-center rounded-lg border-[1.5px] border-dashed border-[#d3d7e0] text-[10.5px] text-faint">
            {t.waysComeHere}
          </div>
        </>
      )}
    </div>
  );
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
        {thing.label}
      </span>
    </div>
  );
}
