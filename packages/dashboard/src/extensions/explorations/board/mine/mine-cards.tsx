// The person's own notes and links on the board, drawn on the board's
// viewport (so they pan and zoom with it): a card with a bar to drag it
// by, a small "Yours" touch in the person's colour (Doodle's notes are
// yellow and dashed), and, once Doodle has taken it in, a faded body with
// a small "Taken in" label. Only the person can take it off.

import { useStore } from "@xyflow/react";
import { Check, GripVertical, Link2, StickyNote, UserRound, X } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { type LinkItem, type NoteItem, useMine } from "./mine-state";
import { previewOf } from "./preview";

function Card({
  item,
  width,
  icon,
  children,
}: Readonly<{
  item: NoteItem | LinkItem;
  width: number;
  icon: ReactNode;
  children: ReactNode;
}>) {
  const t = useTranslation().t;
  const mine = useMine();
  const zoom = useStore((s) => s.transform[2]);
  const selected = mine.selected === item.id;
  const dragging = useRef(false);
  const startDrag = (event: React.PointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("button"))
      return;
    event.preventDefault();
    mine.select(item.id);
    dragging.current = true;
    const from = { x: event.clientX, y: event.clientY, ox: item.x, oy: item.y };
    const move = (at: PointerEvent) => {
      mine.move(
        item.id,
        from.ox + (at.clientX - from.x) / zoom,
        from.oy + (at.clientY - from.y) / zoom,
      );
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };
  return (
    <article
      aria-label={t("explore.board.mine.yours")}
      style={{ left: item.x, top: item.y, width }}
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
            item.taken && "opacity-60",
          )}
        >
          <GripVertical aria-hidden className="size-3.5 flex-none text-faint" />
          <span
            title={t("explore.board.mine.yoursHint")}
            className="inline-flex h-5 flex-none items-center gap-1 rounded-full bg-blue px-1.5 font-medium text-blue-foreground"
          >
            <UserRound aria-hidden className="size-3" />
            {t("explore.board.mine.yours")}
          </span>
          {icon}
        </span>
        <span className="ml-auto flex flex-none items-center gap-1">
          {item.taken && <TakenIn />}
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
        </span>
      </header>
      <div className={cn("transition-opacity", item.taken && "opacity-60")}>
        {children}
      </div>
    </article>
  );
}

// Doodle has the thing: it can move it, never rewrite or delete it.
export function TakenIn() {
  const t = useTranslation().t;
  return (
    <span
      title={t("explore.board.mine.takenInHint")}
      className="inline-flex h-5 items-center gap-1 rounded-full bg-card px-1.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground shadow-[inset_0_0_0_1px_var(--line-soft)]"
    >
      <Check aria-hidden className="size-3" />
      {t("explore.board.mine.takenIn")}
    </span>
  );
}

export function MineNote({ item }: Readonly<{ item: NoteItem }>) {
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

export function MineLink({ item }: Readonly<{ item: LinkItem }>) {
  const preview = previewOf(item.url);
  return (
    <Card
      item={item}
      width={280}
      icon={<Link2 aria-hidden className="size-3 flex-none text-blue" />}
    >
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 items-center gap-2.5 rounded-lg bg-card p-1.5 shadow-[0_0_0_1px_var(--line-soft)]"
      >
        <span
          aria-hidden
          style={{
            background: `linear-gradient(135deg, hsl(${String(preview.hue)} 70% 62%), hsl(${String((preview.hue + 50) % 360)} 70% 48%))`,
          }}
          className="grid size-12 flex-none place-items-center rounded-md text-[18px] font-semibold text-white"
        >
          {preview.site.charAt(0).toUpperCase()}
        </span>
        <span className="grid min-w-0 flex-1">
          <span className="line-clamp-2 text-[13px] leading-snug font-semibold break-words">
            {preview.title}
          </span>
          <span className="truncate text-[11.5px] text-muted-foreground">
            {preview.site}
          </span>
        </span>
      </a>
    </Card>
  );
}
