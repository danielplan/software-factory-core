// The small parts of arranging Home: what heads a block, the dashed slot at
// the end, the block in hand and the line it would drop at.

import { ArrowDown, ArrowUp, GripVertical, Plus, X } from "lucide-react";

import type { AddOnView } from "@/api/client";
import { useT } from "@/i18n/use-t";
import { ownersOf } from "@/lib/home-layout";
import { blockName } from "@/lib/screens";
import { nameOf } from "@/lib/market-view";
import { cn } from "@/lib/utils";

import { smallButton } from "./add-block";

export type Arranging = {
  editing: boolean;
  // A block in hand (just added), and where its drop line is.
  holding: boolean;
  dropAt: number;
};

// What heads a block while arranging: its name, where it comes from, and
// what can be done to it.
export function ArrangeBar({
  id,
  first,
  last,
  addOns,
  onNudge,
  onHide,
}: Readonly<{
  id: string;
  first: boolean;
  last: boolean;
  addOns: AddOnView[];
  onNudge: (by: -1 | 1) => void;
  onHide: () => void;
}>) {
  const t = useT();
  const owner = ownersOf(addOns).get(id);
  return (
    <div className="flex items-center gap-2 text-xs">
      <GripVertical
        aria-label={t.home.arrange.drag}
        className="size-4 cursor-grab text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate font-medium">
        {blockName(t.market.blocks, addOns, id)}
        {owner && (
          <span className="ml-2 font-normal text-muted-foreground">
            {nameOf(t.market, owner)}
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label={t.home.arrange.moveUp}
        disabled={first}
        className={smallButton + " disabled:opacity-40"}
        onClick={() => {
          onNudge(-1);
        }}
      >
        <ArrowUp aria-hidden className="size-3" />
      </button>
      <button
        type="button"
        aria-label={t.home.arrange.moveDown}
        disabled={last}
        className={smallButton + " disabled:opacity-40"}
        onClick={() => {
          onNudge(1);
        }}
      >
        <ArrowDown aria-hidden className="size-3" />
      </button>
      <button type="button" className={smallButton} onClick={onHide}>
        <X aria-hidden className="size-3" />
        {t.home.arrange.hide}
      </button>
    </div>
  );
}

// The dashed slot at the end of Home while arranging: it opens the Add
// dialog, and is where a block in hand goes when the line is last.
export function AddSlot({
  state,
  count,
  onClick,
}: Readonly<{ state: Arranging; count: number; onClick: () => void }>) {
  const t = useT().home.arrange;
  const { holding, dropAt } = state;
  return (
    <button
      type="button"
      data-flip="slot"
      onClick={() => {
        if (!holding) onClick();
      }}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-6 text-[13px] transition-colors duration-150",
        holding && dropAt === count
          ? "border-blue bg-blue/5 text-blue"
          : "border-border text-muted-foreground hover:bg-surface hover:text-foreground",
      )}
    >
      <Plus aria-hidden className="size-4" />
      {holding ? t.place : t.add}
    </button>
  );
}

// The block just added, following the pointer until it is put down.
export function HeldBlock({
  id,
  x,
  y,
  addOns,
}: Readonly<{ id: string; x: number; y: number; addOns: AddOnView[] }>) {
  const t = useT();
  return (
    <div
      aria-hidden
      className="m-rise pointer-events-none fixed z-[60] grid w-56 gap-0.5 rounded-xl border border-border bg-card px-3 py-2 shadow-lg"
      style={{ left: x + 14, top: y + 14, rotate: "1.5deg" }}
    >
      <span className="text-[13px] font-medium">
        {blockName(t.market.blocks, addOns, id)}
      </span>
      <span className="text-[11px] text-muted-foreground">
        {t.home.arrange.holding}
      </span>
    </div>
  );
}

// A thin line between blocks while one is being placed; the nearest is lit.
function DropLine({
  on,
  where,
}: Readonly<{ on: boolean; where: "top" | "bottom" }>) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full transition-colors duration-150",
        where === "top" ? "-top-[11px]" : "-bottom-[11px]",
        on ? "bg-blue" : "bg-blue/20",
      )}
    />
  );
}

// The lines a block in hand can drop at: above this block, and, for the
// last, below it too.
export function DropLines({
  at,
  count,
  dropAt,
}: Readonly<{ at: number; count: number; dropAt: number }>) {
  return (
    <>
      <DropLine on={dropAt === at} where="top" />
      {at === count - 1 && <DropLine on={dropAt === count} where="bottom" />}
    </>
  );
}
