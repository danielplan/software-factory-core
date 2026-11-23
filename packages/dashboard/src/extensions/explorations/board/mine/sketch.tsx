// The person's own sketch cards: a plain white drawing area with a bar above
// it to drag it by, the small "Yours" tag and a remove button. Its drawings
// (mine-layer.tsx) are kept from its corner, so they move with it. The area
// itself lets the pointer through, so the pen can draw on it.

import { GripVertical, Pencil, UserRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { useDrag } from "./mine-cards";
import { type SketchItem, useMine } from "./mine-state";
import type { Target } from "./targets";

export function SketchCard({
  item,
  target,
}: Readonly<{ item: SketchItem; target: Target }>) {
  const t = useTranslation().t;
  const mine = useMine();
  const startDrag = useDrag(item);
  const { box } = target;
  const selected = mine.selected === item.id;
  return (
    <div
      role="group"
      aria-label={t("explore.board.mine.sketchLabel")}
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
      }}
      className={cn(
        "pointer-events-none absolute rounded-[14px] border-[1.5px] border-blue/45 bg-white shadow-[0_1px_2px_rgb(20_24_36/0.05)]",
        selected && "ring-2 ring-blue ring-offset-2",
      )}
    >
      <header
        onPointerDown={(event) => {
          event.stopPropagation();
          startDrag(event);
        }}
        className="nopan nodrag pointer-events-auto absolute bottom-full left-0 mb-1 flex h-6 cursor-grab items-center gap-1 rounded-full bg-card pr-1 pl-1 text-[11px] shadow-[inset_0_0_0_1px_var(--line-soft)] active:cursor-grabbing"
      >
        <GripVertical aria-hidden className="size-3.5 flex-none text-faint" />
        <span
          title={t("explore.board.mine.yoursHint")}
          className="inline-flex h-5 flex-none items-center gap-1 rounded-full bg-blue px-1.5 font-medium text-blue-foreground"
        >
          <UserRound aria-hidden className="size-3" />
          {t("explore.board.mine.yours")}
        </span>
        <Pencil aria-hidden className="size-3 flex-none text-blue" />
        <button
          type="button"
          title={t("explore.board.mine.remove")}
          aria-label={t("explore.board.mine.remove")}
          className="grid size-5 place-items-center rounded-full text-faint hover:text-foreground"
          onClick={() => {
            mine.remove(item.id);
          }}
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </header>
    </div>
  );
}
