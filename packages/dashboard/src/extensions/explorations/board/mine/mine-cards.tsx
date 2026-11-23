// The team's own notes and links on the board, drawn on the board's
// viewport (so they pan and zoom with it): a card with a bar to drag it by,
// a small "Yours" tag in the person's colour (Doodle's notes are yellow and
// dashed), and, once Doodle has taken it in, a faded body with a small
// "Taken in" label. Only the person can take it off.

import { useStore } from "@xyflow/react";
import { GripVertical, Link2, StickyNote, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { LinkBody } from "./link-card";
import { useMine } from "./mine-state";
import { TakenIn, YoursTag } from "./tags";
import type { Link, Note } from "./own";

// Dragging a card of the person's by its bar: it follows the pointer, at
// the board's zoom, and is sent where it is dropped.
export function useDrag(item: { id: string; place: { x: number; y: number } }) {
  const mine = useMine();
  const zoom = useStore((s) => s.transform[2]);
  return (event: React.PointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("button"))
      return;
    event.preventDefault();
    mine.select(item.id);
    const from = {
      x: event.clientX,
      y: event.clientY,
      ox: item.place.x,
      oy: item.place.y,
    };
    const move = (at: PointerEvent) => {
      mine.drag(
        item.id,
        from.ox + (at.clientX - from.x) / zoom,
        from.oy + (at.clientY - from.y) / zoom,
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      mine.drop(item.id);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
}

export function RemoveChip({ onRemove }: Readonly<{ onRemove: () => void }>) {
  const t = useTranslation().t;
  return (
    <button
      type="button"
      title={t("explore.board.mine.remove")}
      aria-label={t("explore.board.mine.remove")}
      className="grid size-5 place-items-center rounded-full text-faint hover:text-foreground"
      onClick={onRemove}
    >
      <X aria-hidden className="size-3.5" />
    </button>
  );
}

function Card({
  item,
  width,
  icon,
  children,
}: Readonly<{
  item: Note | Link;
  width: number;
  icon: ReactNode;
  children: ReactNode;
}>) {
  const t = useTranslation().t;
  const mine = useMine();
  const selected = mine.selected === item.id;
  const startDrag = useDrag(item);
  const taken = item.taken === true;
  return (
    <article
      aria-label={t("explore.board.mine.yours")}
      style={{ left: item.place.x, top: item.place.y, width }}
      className={cn(
        "nopan nodrag pointer-events-auto absolute grid gap-1.5 rounded-[14px] border-[1.5px] border-blue/45 bg-wash p-2.5 text-left text-[13px] shadow-[0_1px_2px_rgb(20_24_36/0.05)]",
        selected && "ring-2 ring-blue ring-offset-2",
      )}
      onPointerDown={(event) => {
        event.stopPropagation();
        mine.select(item.id);
      }}
    >
      <header
        onPointerDown={startDrag}
        className="flex min-w-0 cursor-grab items-center gap-1.5 text-[11px] active:cursor-grabbing"
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-1.5",
            taken && "opacity-60",
          )}
        >
          <GripVertical aria-hidden className="size-3.5 flex-none text-faint" />
          <YoursTag />
          {icon}
        </span>
        <span className="ml-auto flex flex-none items-center gap-1">
          {taken && <TakenIn />}
          <RemoveChip
            onRemove={() => {
              mine.remove(item.id);
            }}
          />
        </span>
      </header>
      <div className={cn("transition-opacity", taken && "opacity-60")}>
        {children}
      </div>
    </article>
  );
}

export function MineNote({ item }: Readonly<{ item: Note }>) {
  return (
    <Card
      item={item}
      width={240}
      icon={<StickyNote aria-hidden className="size-3 flex-none text-blue" />}
    >
      <p className="text-[13.5px] leading-snug break-words">{item.text}</p>
    </Card>
  );
}

export function MineLink({ item }: Readonly<{ item: Link }>) {
  return (
    <Card
      item={item}
      width={280}
      icon={<Link2 aria-hidden className="size-3 flex-none text-blue" />}
    >
      <LinkBody item={item} />
    </Card>
  );
}
