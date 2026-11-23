// The person's own notes and links on the board, drawn on the board's
// viewport (so they pan and zoom with it): a card with a bar to drag it
// by, a small "Yours" touch in the person's colour (Doodle's notes are
// yellow and dashed), and, once Doodle has taken it in, a faded body with
// a small "Taken in" label. Only the person can take it off.

import { useStore } from "@xyflow/react";
import { Check, GripVertical, Link2, StickyNote, UserRound, X } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { type LinkItem, type NoteItem, useMine } from "./mine-state";
import { previewOf } from "./preview";

// Dragging a card of the person's by its bar: it follows the pointer, at the
// board's zoom.
export function useDrag(item: { id: string; x: number; y: number }) {
  const mine = useMine();
  const zoom = useStore((s) => s.transform[2]);
  return (event: React.PointerEvent) => {
    if (event.button !== 0 || (event.target as Element).closest("button"))
      return;
    event.preventDefault();
    mine.select(item.id);
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
}

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
  const selected = mine.selected === item.id;
  const startDrag = useDrag(item);
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

// The site's small icon: its first letter on its colour.
function SiteIcon({
  site,
  hue,
  size,
}: Readonly<{ site: string; hue: number; size: number }>) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        background: `linear-gradient(135deg, hsl(${String(hue)} 65% 55%), hsl(${String((hue + 45) % 360)} 65% 42%))`,
      }}
      className="grid flex-none place-items-center rounded-[5px] leading-none font-semibold text-white"
    >
      {site.charAt(0).toUpperCase()}
    </span>
  );
}

// The preview picture across the top: made up from the site's colour.
function PreviewPicture({ hue }: Readonly<{ hue: number }>) {
  const light = `hsl(${String(hue)} 70% 78%)`;
  const mid = `hsl(${String((hue + 30) % 360)} 60% 58%)`;
  const dark = `hsl(${String((hue + 60) % 360)} 55% 36%)`;
  return (
    <svg
      aria-hidden
      viewBox="0 0 382 200"
      preserveAspectRatio="xMidYMid slice"
      className="block aspect-[1.91/1] w-full"
    >
      <defs>
        <linearGradient id={`sky-${String(hue)}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
      </defs>
      <rect width="382" height="200" fill={`url(#sky-${String(hue)})`} />
      <circle cx="300" cy="62" r="30" fill="white" fillOpacity="0.55" />
      <path d="M0 150 C70 100 120 130 190 112 S320 90 382 130 V200 H0Z" fill={mid} />
      <path d="M0 178 C80 140 150 170 230 150 S340 140 382 164 V200 H0Z" fill={dark} />
    </svg>
  );
}

// A link as a shared one looks: a preview picture across the top, the page's
// title in bold, below it the site's small icon and name. Without a preview
// picture: the site's icon, the address and the title. A click opens it in a
// new tab.
export function MineLink({ item }: Readonly<{ item: LinkItem }>) {
  const t = useTranslation().t;
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
        rel="noreferrer noopener"
        draggable={false}
        title={t("explore.board.mine.linkOpens", { site: preview.site })}
        aria-label={`${preview.title}. ${t("explore.board.mine.linkOpens", { site: preview.site })}`}
        className="block overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_var(--line-soft)] transition-shadow hover:shadow-[0_0_0_1.5px_var(--blue)]"
      >
        {preview.picture ? (
          <>
            <PreviewPicture hue={preview.hue} />
            <span className="grid gap-1 p-2.5">
              <span className="line-clamp-2 text-[13.5px] leading-snug font-semibold break-words">
                {preview.title}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted-foreground">
                <SiteIcon site={preview.site} hue={preview.hue} size={14} />
                <span className="truncate">{preview.site}</span>
              </span>
            </span>
          </>
        ) : (
          <span className="flex min-w-0 items-center gap-2.5 p-2.5">
            <SiteIcon site={preview.site} hue={preview.hue} size={28} />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="line-clamp-2 text-[13px] leading-snug font-semibold break-words">
                {preview.title}
              </span>
              <span className="truncate text-[11.5px] text-muted-foreground">
                {preview.shown}
              </span>
            </span>
          </span>
        )}
      </a>
    </Card>
  );
}
