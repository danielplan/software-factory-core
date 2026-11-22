// Home as blocks. Each extension brings blocks (what waits for you, the
// loop, the ideas being explored); the team drags, hides and adds them, and
// the arrangement is kept in the factory's files, one Home for the team.
// This is the arranging: the blocks themselves are drawn by the page.

import { Check, LayoutGrid } from "lucide-react";
import { type ReactNode, useRef } from "react";

import type { AddOnView } from "@/api";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/use-t";
import { type Layout, nudge } from "@/lib/home-layout";
import { useFlip } from "@/lib/use-flip";
import { cn } from "@/lib/utils";

import { AddBlock } from "./add-block";
import {
  AddSlot,
  type Arranging,
  ArrangeBar,
  DropLines,
  HeldBlock,
} from "./arrange-parts";
import { type Dragging, useArranging } from "./use-arranging";

// Arrange Home, at the right of the page's title; Done while arranging.
export function ArrangeButton({
  editing,
  onClick,
}: Readonly<{ editing: boolean; onClick: () => void }>) {
  const t = useT().home.arrange;
  return (
    <Button variant="ring" size="pill" onClick={onClick}>
      {editing ? <Check aria-hidden /> : <LayoutGrid aria-hidden />}
      {editing ? t.done : t.arrange}
    </Button>
  );
}

export function HomeBlocks({
  blocks,
  layout,
  onChange,
  addOns,
  offered,
  editing,
  adding,
  onAdding,
}: Readonly<{
  // What each block shows, by its id.
  blocks: Record<string, ReactNode>;
  layout: Layout;
  onChange: (layout: Layout) => void;
  addOns: AddOnView[];
  // The blocks of installed extensions that the page can draw.
  offered: Set<string>;
  editing: boolean;
  // The "Add a block" dialog, opened from the page's header or the empty slot.
  adding: boolean;
  onAdding: (open: boolean) => void;
}>) {
  const arranging = useArranging(layout, onChange, offered, editing);
  const { held, dropAt, shown } = arranging;
  // Calm motion: blocks slide to their new place and a new one fades in, but
  // only when the person did something to them.
  const root = useRef<HTMLDivElement>(null);
  useFlip(root, true, arranging.act);
  const state: Arranging = { editing, holding: held !== null, dropAt };
  return (
    <>
      <div ref={root} className="grid gap-4">
        {shown.map((id, at) => (
          <BlockFrame
            key={id}
            id={id}
            at={at}
            count={shown.length}
            state={state}
            drag={arranging.drag}
            leaving={arranging.leaving === id}
            lit={arranging.lit === id}
            addOns={addOns}
            onNudge={(by) => {
              arranging.change(nudge(layout, id, by, offered));
            }}
            onHide={() => {
              arranging.remove(id);
            }}
          >
            {blocks[id]}
          </BlockFrame>
        ))}
        {editing && (
          <AddSlot
            state={state}
            count={shown.length}
            onClick={() => {
              onAdding(true);
            }}
          />
        )}
      </div>
      {held && <HeldBlock id={held.id} x={held.x} y={held.y} />}
      <AddBlock
        layout={layout}
        offeredBy={addOns
          .filter((addOn) => addOn.on)
          .map((addOn) => ({
            addOn,
            blocks: addOn.brings.blocks.filter((id) => id in blocks),
          }))
          .filter((one) => one.blocks.length > 0)}
        open={adding && editing && !held}
        onOpenChange={onAdding}
        onPick={(id, x, y) => {
          arranging.pick(id, x, y);
          onAdding(false);
        }}
      />
    </>
  );
}

// What a block can be dragged, and dropped on.
function dragProps(drag: Dragging, id: string, on: boolean) {
  return {
    draggable: on,
    onDragStart: () => {
      drag.start(id);
    },
    onDragEnd: drag.end,
    onDragOver: (e: { preventDefault: () => void }) => {
      if (!on || !drag.dragging) return;
      e.preventDefault();
      drag.enter(id);
    },
    onDrop: () => {
      drag.drop(id);
    },
  };
}

// How a block looks while arranging: a dashed box, dimmed when it is being
// dragged, tinted when another is over it.
function arrangedClass(drag: Dragging, id: string): string {
  const dragged = drag.dragging === id;
  return cn(
    "rounded-xl border border-dashed border-border p-2 [&_[data-block-title]]:hidden",
    drag.over === id && !dragged && "bg-surface",
    dragged && "opacity-50",
  );
}

function BlockFrame({
  id,
  at,
  count,
  state,
  drag,
  leaving,
  lit,
  addOns,
  onNudge,
  onHide,
  children,
}: Readonly<{
  id: string;
  at: number;
  count: number;
  state: Arranging;
  drag: Dragging;
  leaving: boolean;
  lit: boolean;
  addOns: AddOnView[];
  onNudge: (by: -1 | 1) => void;
  onHide: () => void;
  children: ReactNode;
}>) {
  const { editing, holding, dropAt } = state;
  return (
    <div
      data-block={id}
      data-flip={id}
      {...dragProps(drag, id, editing && !holding)}
      className={cn(
        "relative grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        leaving ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
        lit && "m-ring rounded-xl",
      )}
    >
      {holding && <DropLines at={at} count={count} dropAt={dropAt} />}
      <div
        className={cn(
          "grid min-h-0 gap-2",
          leaving && "overflow-hidden",
          editing && arrangedClass(drag, id),
        )}
      >
        {editing && (
          <ArrangeBar
            id={id}
            first={at === 0}
            last={at === count - 1}
            addOns={addOns}
            onNudge={onNudge}
            onHide={onHide}
          />
        )}
        {children}
      </div>
    </div>
  );
}
