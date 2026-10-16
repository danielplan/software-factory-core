import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Check, Trash2 } from "lucide-react";
import { use } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { CanvasChange, type Piece, type PieceNode } from "./canvas";
import { ICON } from "./icons";

const KIND: Record<Piece["kind"], string> = {
  company: "Project",
  area: "Area",
  card: "Card",
  install: "To install",
};

// One thing on the setup canvas: a plain card to read, with a dashed
// outline while it is a sketch and a solid one once agreed. The owner
// moves it by dragging it anywhere and takes it off with the bin that
// shows on hover (all but the project); they change it by talking:
// clicking it attaches it to their next message to the coach.
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
  return (
    <article
      aria-label={KIND[piece.kind]}
      className={cn(
        "piece-handle group relative grid w-[240px] animate-pop cursor-grab content-start gap-1.5 rounded-2xl border-2 bg-card p-3.5 text-card-foreground shadow-soft transition-opacity",
        settledOf(piece)
          ? "border-solid border-arrow"
          : "border-dashed border-arrow",
        piece.kind === "card" && TONE[piece.thing.tone ?? "fact"],
        focused && FOCUSED,
        attached &&
          "ring-2 ring-foreground ring-offset-2 ring-offset-background",
        !placed && "opacity-0",
      )}
    >
      <Handles />
      <PieceBody id={id} piece={piece} />
      {piece.kind !== "company" && <TakeOff id={id} kind={KIND[piece.kind]} />}
    </article>
  );
}

// What the coach points the owner to: a soft glow of the coach's own
// colours around it.
const FOCUSED =
  "shadow-[0_0_0_4px_var(--glow-c),0_0_32px_8px_color-mix(in_oklab,var(--glow-b)_80%,transparent)]";

// A rule (what must never happen) and a question (still open) stand out
// from the facts around them.
// The icon a rule or a question has when the coach gave it none.
const TONE_ICON = { rule: "never", question: "question" } as const;

const TONE = {
  fact: "",
  rule: "bg-[color-mix(in_oklab,var(--destructive)_7%,var(--card))]",
  question: "bg-[color-mix(in_oklab,var(--glow-c)_60%,var(--card))]",
} as const;

// Where arrows leave and arrive when they have no way of their own
// (route-edge.tsx): out at the bottom, in at the top; unseen.
function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </>
  );
}

function TakeOff({ id, kind }: Readonly<{ id: string; kind: string }>) {
  const change = use(CanvasChange);
  return (
    <button
      type="button"
      aria-label={`Take the ${kind.toLowerCase()} off the canvas`}
      className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-lg bg-card text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-surface-2 hover:text-foreground focus-visible:opacity-100 [&_svg]:size-3.5"
      onClick={() => {
        change({ remove: id });
      }}
    >
      <Trash2 aria-hidden />
    </button>
  );
}

// Solid once agreed: a card, once every item is confirmed.
function settledOf(piece: Exclude<Piece, { kind: "area" }>): boolean {
  switch (piece.kind) {
    case "company":
      return piece.company.settled;
    case "card":
      return piece.thing.confirmed;
    case "install":
      return piece.thing.answer === "approved";
  }
}

function PieceBody({
  id,
  piece,
}: Readonly<{ id: string; piece: Exclude<Piece, { kind: "area" }> }>) {
  switch (piece.kind) {
    case "company":
      return (
        <Named
          name={piece.company.name || "Your project"}
          about={piece.company.about || "Its vision appears here."}
        />
      );
    case "card":
      return <CardBody piece={piece} />;
    case "install":
      return <InstallBody id={id} piece={piece} />;
  }
}

// A name and the sentence under it.
// A card: its icon, its title and a line under it; or a picture from the
// project with its title as the caption. A guess not yet confirmed is
// lighter.
function CardBody({
  piece,
}: Readonly<{ piece: Extract<Piece, { kind: "card" }> }>) {
  const { title, text, icon, picture, tone, confirmed } = piece.thing;
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

function Named({ name, about }: Readonly<{ name: string; about: string }>) {
  return (
    <>
      <span className="text-[15px] font-medium">{name}</span>
      {about && (
        <span className="text-[13px] leading-snug text-muted-foreground">
          {about}
        </span>
      )}
    </>
  );
}

function InstallBody({
  id,
  piece,
}: Readonly<{ id: string; piece: Extract<Piece, { kind: "install" }> }>) {
  const change = use(CanvasChange);
  const { thing } = piece;
  const answer = (choice: "approved" | "declined") => {
    change({ install: { id, answer: choice } });
  };
  return (
    <div className="grid gap-2">
      <p className="text-[15px] font-medium">{thing.name}</p>
      <p className="text-[13px] leading-snug text-muted-foreground">
        {thing.why || thing.about}
      </p>
      <div className="flex gap-2">
        <Button
          variant={thing.answer === "approved" ? "default" : "outline"}
          className="h-8 flex-1 px-3 text-[13px]"
          aria-pressed={thing.answer === "approved"}
          onClick={() => {
            answer("approved");
          }}
        >
          <Check aria-hidden /> Approve
        </Button>
        <Button
          variant={thing.answer === "declined" ? "secondary" : "ghost"}
          className="h-8 flex-1 px-3 text-[13px]"
          aria-pressed={thing.answer === "declined"}
          onClick={() => {
            answer("declined");
          }}
        >
          Not now
        </Button>
      </div>
      {thing.answer === "approved" && (
        <p className="text-xs text-success">
          Installed when the factory is made.
        </p>
      )}
    </div>
  );
}
