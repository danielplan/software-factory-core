// The card every thing on the board sits in: a dashed outline while it is
// a sketch, a solid green one once agreed; a bar on top to drag it by, with
// its kind, its title and its Sketch or Agreed badge (a click switches it);
// a ring while the kobold points at it or a person attached it. Drawn
// invisibly until the board has laid it out.

import { Handle, Position } from "@xyflow/react";
import { Check, GripVertical, X } from "lucide-react";
import { createContext, type ReactNode, use } from "react";

import { messageOf, post } from "@/api/client";
import { cn } from "@/lib/utils";

import { KINDS } from "../kinds";
import type { ThingData } from "./nodes";
import { useT } from "@/i18n/use-t";

// Where a button on the board says why it did not work (the page shows it).
export const BoardProblem = createContext<(problem: string | null) => void>(
  () => undefined,
);

// What a person does on the board; why it did not work is said.
export function useBoardDo(exploration: string) {
  const say = use(BoardProblem);
  return (path: string, body: Record<string, unknown>) => {
    say(null);
    post(`/api/kobble/explorations/${path}`, {
      id: exploration,
      ...body,
    }).catch((error: unknown) => {
      say(messageOf(error));
    });
  };
}

function AgreeTick({ data }: Readonly<{ data: ThingData }>) {
  const t = useT();
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  return (
    <button
      type="button"
      aria-pressed={thing.agreed}
      aria-label={
        thing.agreed ? t.explore.board.agreedHint : t.explore.board.sketchHint
      }
      onClick={() => {
        act("board", {
          do: { act: "agree", id: thing.id, agreed: !thing.agreed },
        });
      }}
      className={cn(
        "nodrag inline-flex h-5 flex-none items-center gap-1 rounded-full px-2 text-[11px] font-medium",
        thing.agreed
          ? "bg-[#e3f5ee] text-[#197653]"
          : "text-faint shadow-[inset_0_0_0_1px_var(--line-soft)] hover:text-muted-foreground",
      )}
    >
      {thing.agreed && <Check aria-hidden className="size-3" />}
      {thing.agreed ? t.explore.board.agreed : t.explore.board.sketch}
    </button>
  );
}

// Solid green once agreed; dashed while a sketch.
function outlineOf(agreed: boolean, tone: "card" | "note"): string {
  const ground = tone === "note" ? "bg-[#fffbea]" : "bg-card";
  if (agreed) return cn(ground, "border-solid border-[#12a594]");
  const line = tone === "note" ? "border-[#e8d58a]" : "border-[#d3d7e0]";
  return cn(ground, "border-dashed", line);
}

// The person's own pictures and notes can be taken off.
function RemoveButton({ data }: Readonly<{ data: ThingData }>) {
  const t = useT();
  const { thing, page } = data;
  const act = useBoardDo(page.exploration.id);
  if (
    thing.by !== "person" ||
    !(thing.kind === "picture" || thing.kind === "note")
  )
    return null;
  return (
    <button
      type="button"
      aria-label={t.explore.board.remove}
      className="nodrag grid size-5 place-items-center rounded-full text-faint hover:text-foreground"
      onClick={() => {
        act("board", { do: { act: "remove", id: thing.id } });
      }}
    >
      <X aria-hidden className="size-3.5" />
    </button>
  );
}

export function Frame({
  data,
  title,
  tag,
  tone = "card",
  glow = false,
  children,
}: Readonly<{
  data: ThingData;
  title?: string;
  // After the kind, in its badge: the prototype's letter.
  tag?: string;
  tone?: "card" | "note";
  // Glows while the kobold works on it (a prototype being made).
  glow?: boolean;
  children: ReactNode;
}>) {
  const t = useT();
  const { thing, pointed, attached, placed } = data;
  return (
    <article
      aria-label={
        title
          ? `${t.explore.kinds[thing.kind]}: ${title}`
          : t.explore.kinds[thing.kind]
      }
      className={cn(
        "grid gap-2 rounded-[14px] border-[1.5px] p-3 text-left text-[13px] shadow-[0_1px_2px_rgb(20_24_36/0.04)] transition-[opacity,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgb(20_24_36/0.35)]",
        outlineOf(thing.agreed, tone),
        pointed && "ring-4 ring-blue/40",
        attached && "ring-2 ring-blue ring-offset-2",
        !placed && "opacity-0",
        glow && "border-blue/50 motion-safe:animate-making-glow",
      )}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <header className="thing-handle flex min-w-0 cursor-grab items-center gap-1.5 text-[12px] text-muted-foreground active:cursor-grabbing">
        <GripVertical aria-hidden className="size-3.5 flex-none text-faint" />
        <KindBadge kind={thing.kind} tag={tag} />
        <span className="ml-auto flex items-center gap-1">
          <AgreeTick data={data} />
          <RemoveButton data={data} />
        </span>
      </header>
      {title && (
        <div className="text-[13.5px] font-semibold leading-snug">{title}</div>
      )}
      {children}
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </article>
  );
}

function KindBadge({
  kind,
  tag,
}: Readonly<{ kind: ThingData["thing"]["kind"]; tag?: string }>) {
  const t = useT();
  const { Icon, tint } = KINDS[kind];
  return (
    <span
      className={cn(
        "inline-flex h-5 flex-none items-center gap-1 rounded-full px-1.5 text-[11px] font-medium",
        tint,
      )}
    >
      <Icon aria-hidden className="size-3" />
      {tag ? `${t.explore.kinds[kind]} ${tag}` : t.explore.kinds[kind]}
    </span>
  );
}
