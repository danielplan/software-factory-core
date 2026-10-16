import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { use } from "react";

import { cn } from "@/lib/utils";

import { CanvasChange, type Piece, type PieceNode } from "./canvas";
import { ICON } from "./icons";

type Card = Extract<Piece, { kind: "card" }>["card"];

// What the coach points the owner to: a soft glow of the coach's own
// colours around it.
const FOCUSED =
  "shadow-[0_0_0_4px_var(--glow-c),0_0_32px_8px_color-mix(in_oklab,var(--glow-b)_80%,transparent)]";

// The icon a rule or a question has when the coach gave it none.
const TONE_ICON = { rule: "never", question: "question" } as const;

// A rule (what must never happen) and a question (still open) stand out
// from the facts around them.
const TONE = {
  fact: "",
  rule: "bg-[color-mix(in_oklab,var(--destructive)_7%,var(--card))]",
  question: "bg-[color-mix(in_oklab,var(--glow-c)_60%,var(--card))]",
} as const;

// One thing on the map: an area's frame with its title, or a card to read,
// dashed while it is a guess and solid once the owner agreed. The owner
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
          "size-full rounded-3xl border border-border/70 bg-card/35 transition-[opacity,box-shadow]",
          focused && FOCUSED,
          !placed && "opacity-0",
        )}
      >
        <h2 className="piece-handle cursor-grab px-4 pt-3.5 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          {piece.title}
        </h2>
      </section>
    );
  const { card } = piece;
  return (
    <article
      aria-label={card.title}
      className={cn(
        "piece-handle group relative grid w-[240px] animate-pop cursor-grab content-start gap-1.5 rounded-2xl border-2 border-arrow bg-card p-3.5 text-card-foreground shadow-soft transition-opacity",
        card.confirmed ? "border-solid" : "border-dashed",
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
// project with its title as the caption. A guess not yet confirmed is
// lighter.
function CardBody({ card }: Readonly<{ card: Card }>) {
  const { title, text, icon, picture, tone, confirmed } = card;
  const named = icon ?? (tone ? TONE_ICON[tone] : undefined);
  const Icon = named ? ICON[named] : null;
  return (
    <div className={cn("grid gap-1.5", !confirmed && "opacity-70")}>
      {picture && (
        <img
          src={`/api/setup/picture?path=${encodeURIComponent(picture)}`}
          alt={title}
          className="max-h-56 w-full rounded-lg bg-surface-2 object-contain"
        />
      )}
      <span className="flex items-center gap-2 pr-6 text-[15px] leading-snug font-medium">
        {Icon && (
          <span className="flex size-8 flex-none items-center justify-center rounded-full bg-[var(--glow-c)] [&_svg]:size-4">
            <Icon aria-hidden />
          </span>
        )}
        {title}
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
