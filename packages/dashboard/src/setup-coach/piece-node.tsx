import { Handle, type NodeProps, Position } from "@xyflow/react";
import { CircleCheck, Trash2 } from "lucide-react";
import { use } from "react";

import { cn } from "@/lib/utils";

import { CanvasChange, type Piece, type PieceNode } from "./canvas";
import { ICON } from "./icons";

type Card = Extract<Piece, { kind: "card" }>["card"];

// What the coach points the owner to: a soft ring of the accent around it.
const FOCUSED =
  "shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_22%,transparent),0_0_32px_6px_color-mix(in_oklab,var(--primary)_12%,transparent)]";

// The icon a rule or a question has when the coach gave it none.
const TONE_ICON = { rule: "never", question: "question" } as const;

// A rule (what must never happen) and a question (still open) stand out
// from the facts around them.
const TONE = {
  fact: "",
  rule: "bg-[color-mix(in_oklab,var(--destructive)_6%,var(--card))]",
  question: "bg-[var(--tint)]",
} as const;

// One thing on the map: an area's frame with its title, or a card to read,
// with a tick once the owner agreed to it. The owner
// moves a card by dragging it anywhere and takes it off with the bin that
// shows on hover; they change it by talking: clicking it attaches it to
// their next message to the coach.
export function PieceNodeView({ id, data }: NodeProps<PieceNode>) {
  const { piece, attached, focused, placed } = data;
  if (piece.kind === "area")
    return (
      <section
        aria-label={piece.title}
        className={cn(
          "size-full rounded-[calc(var(--radius)+14px)] border border-border/80 bg-card/45 transition-[opacity,box-shadow]",
          focused && FOCUSED,
          !placed && "opacity-0",
        )}
      >
        <h2 className="piece-handle cursor-grab px-4 pt-3.5 text-sm font-semibold text-muted-foreground">
          {piece.title}
        </h2>
      </section>
    );
  const { card } = piece;
  return (
    <article
      aria-label={card.title}
      className={cn(
        "piece-handle group relative grid w-[240px] animate-pop cursor-grab content-start gap-1.5 rounded-[calc(var(--radius)+4px)] border border-border bg-card p-3.5 text-card-foreground shadow-soft transition-[opacity,box-shadow]",
        TONE[card.tone ?? "fact"],
        focused && FOCUSED,
        attached &&
          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        !placed && "opacity-0",
      )}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <CardBody card={card} />
      <TakeOff id={id} />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </article>
  );
}

function TakeOff({ id }: Readonly<{ id: string }>) {
  const change = use(CanvasChange);
  return (
    <button
      type="button"
      aria-label="Take the card off the map"
      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-lg bg-card text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-foreground focus-visible:opacity-100 [&_svg]:size-3.5"
      onClick={() => {
        change({ remove: id });
      }}
    >
      <Trash2 aria-hidden />
    </button>
  );
}

// A card: its icon, its title and a line under it; or a picture from the
// project with its title as the caption. Once the owner agreed, a tick
// follows the title.
function CardBody({ card }: Readonly<{ card: Card }>) {
  const { title, text, icon, picture, tone, confirmed } = card;
  const named = icon ?? (tone ? TONE_ICON[tone] : undefined);
  const Icon = named ? ICON[named] : null;
  return (
    <div className="grid gap-1.5">
      {picture && (
        <img
          src={`/api/setup/picture?path=${encodeURIComponent(picture)}`}
          alt={title}
          className="max-h-56 w-full rounded-lg bg-surface-2 object-contain"
        />
      )}
      <span className="flex items-center gap-2 pr-6 text-[15px] leading-snug font-medium">
        {Icon && (
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-[var(--tint)] text-primary [&_svg]:size-4">
            <Icon aria-hidden />
          </span>
        )}
        {title}
        {confirmed && (
          <CircleCheck
            aria-label="Agreed"
            className="size-4 flex-none text-success"
          />
        )}
      </span>
      {text && (
        <span className="text-[13px] leading-snug text-muted-foreground">
          {text}
        </span>
      )}
      {!confirmed && (
        <span className="sr-only">A guess, not yet confirmed.</span>
      )}
    </div>
  );
}
