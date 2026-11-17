// Small pieces of the Explorations pages: persona faces in a row, the
// Sketch or Agreed badge, and the small preview of a canvas.

import type { ExplorationRow, Face } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

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

export function Badge({ agreed }: Readonly<{ agreed: boolean }>) {
  return agreed ? (
    <span className="inline-flex h-5 items-center rounded-full bg-[#e3f5ee] px-2.5 text-[11px] font-medium text-[#197653]">
      ✓ Agreed
    </span>
  ) : (
    <span className="inline-flex h-5 items-center rounded-full px-2.5 text-[11px] font-medium text-faint shadow-[inset_0_0_0_1px_var(--line-soft)]">
      Sketch
    </span>
  );
}

// The canvas in small: the problem and what we heard, the choice with its
// options (the agreed one green), and the prototypes (the agreed one
// outlined in green); a dashed one while there is none.
export function Preview({ row }: Readonly<{ row: ExplorationRow }>) {
  const agreed = row.prototypes.find((one) => one.agreed)?.key;
  return (
    <div className="relative flex h-28 items-center gap-3.5 rounded-xl bg-[#f7f8fa] bg-[radial-gradient(#dde1ea_1px,transparent_1px)] bg-size-[10px_10px] px-[18px]">
      <div className="flex flex-col gap-1.5">
        <div className="h-[34px] w-[58px] rounded-md bg-[#fff6cf] shadow-[0_0_0_1px_#f1e3a6]" />
        <div className="h-[26px] w-[58px] rounded-md bg-card shadow-[0_0_0_1px_var(--line-soft)]" />
      </div>
      <span className="text-[#b6bccb]">→</span>
      <div
        className={cn(
          "flex h-[66px] w-[62px] flex-col gap-1 rounded-md bg-card p-1.5",
          agreed
            ? "shadow-[0_0_0_1px_#12a594]"
            : "shadow-[0_0_0_1px_var(--line-soft)]",
        )}
      >
        {row.options.map((key) => (
          <div
            key={key}
            className={cn(
              "h-[9px] rounded-[3px]",
              key === agreed ? "bg-[#cdeee2]" : "bg-[#eef0f4]",
            )}
          />
        ))}
      </div>
      <span className="text-[#b6bccb]">→</span>
      <div className="flex flex-col gap-[5px]">
        {row.prototypes.length === 0 && (
          <div className="h-[22px] w-12 rounded-[5px] border-[1.5px] border-dashed border-[#d3d7e0]" />
        )}
        {row.prototypes.map((one) => (
          <div
            key={one.key}
            className={cn(
              "h-[22px] w-12 rounded-[5px] bg-card",
              one.agreed
                ? "shadow-[0_0_0_2px_#12a594]"
                : "shadow-[0_0_0_1px_var(--line-soft)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}
