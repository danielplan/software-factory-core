// The pieces a step's cards are drawn with, as in the design: a tile (an
// icon or the persona's kobold, the title, a line, where it came from), a
// row, a person's row with initials, a big row to pick, and New persona.
// Clicking a card asks the kobold about it; × takes it off.

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

import { type Card, faceFrom, messageOf, post } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { appParts, fromLine, textOf, withHidden } from "./card-bits";
import { ICON } from "./icons";
import { useT } from "@/i18n/use-t";

// What a card can do: be removed.
export type CardActs = { onRemove: (id: string) => void };

function Icon({ card }: Readonly<{ card: Card }>) {
  const Shown = card.icon ? ICON[card.icon] : null;
  return (
    <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-wash text-wash-foreground">
      {Shown && <Shown className="size-[17px]" aria-hidden />}
    </span>
  );
}

function Remove({ card, acts }: Readonly<{ card: Card; acts: CardActs }>) {
  const t = useT();
  return (
    <button
      type="button"
      aria-label={t.setup.cards.takeOff(card.title)}
      className="grid size-7 flex-none place-items-center rounded-lg text-faint hover:bg-ground hover:text-foreground-2"
      onClick={(event) => {
        event.stopPropagation();
        acts.onRemove(card.id);
      }}
    >
      <X className="size-[15px]" aria-hidden />
    </button>
  );
}

// A card's words, corrected in place: a click to type, and leaving the
// field saves it (the card counts as agreed from then on).
function Editable({
  card,
  field,
  value,
  className,
}: Readonly<{
  card: Card;
  field: "title" | "text";
  value: string;
  className?: string;
}>) {
  const t = useT();
  // The text keeps what the card shows apart: its folder, its source.
  const whole = (now: string) =>
    field === "text" ? withHidden(card, now) : now;
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={
        field === "title" ? t.setup.cards.title : t.setup.cards.whatItSays
      }
      className={cn(
        "-mx-1 rounded-md px-1 outline-none hover:bg-ground focus:bg-ground",
        className,
      )}
      onBlur={(event) => {
        const now = event.currentTarget.textContent.trim();
        if (now && now !== value)
          void post("/api/setup/draft", {
            edit: { id: card.id, [field]: whole(now) },
          });
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    >
      {value}
    </span>
  );
}

export function Tile({
  card,
  acts,
  person = false,
  app = false,
}: Readonly<{ card: Card; acts: CardActs; person?: boolean; app?: boolean }>) {
  const t = useT();
  const parts = app
    ? appParts(card)
    : { text: textOf(card), from: fromLine(card, t.setup.guess) };
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl bg-card px-4 py-3.5 shadow-card",
      )}
    >
      <div className="flex items-center gap-2.5">
        {person ? (
          <PersonaFace
            face={faceFrom({ name: card.title, about: card.text ?? "" })}
            size={44}
          />
        ) : (
          <Icon card={card} />
        )}
        <Editable
          card={card}
          field="title"
          value={card.title}
          className="min-w-0 flex-1 leading-snug font-semibold"
        />
        <Remove card={card} acts={acts} />
      </div>
      {parts.text && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          <Editable card={card} field="text" value={parts.text} />
        </p>
      )}
      <span className="mt-auto text-xs text-faint">{parts.from}</span>
    </article>
  );
}

export function Row({ card, acts }: Readonly<{ card: Card; acts: CardActs }>) {
  const t = useT();
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-t border-border-soft px-[18px] py-3.5 first:border-t-0",
      )}
    >
      <Icon card={card} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          <Editable card={card} field="title" value={card.title} />
        </div>
        <div className="text-[12.5px] text-muted-foreground">
          <Editable card={card} field="text" value={textOf(card)} />
        </div>
      </div>
      <span className="text-xs text-faint max-sm:hidden">
        {fromLine(card, t.setup.guess)}
      </span>
      <Remove card={card} acts={acts} />
    </div>
  );
}

export function PersonRow({
  card,
  acts,
  initials,
}: Readonly<{ card: Card; acts: CardActs; initials: string }>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-t border-border-soft px-[18px] py-3.5 first:border-t-0",
      )}
    >
      <span className="grid size-[38px] flex-none place-items-center rounded-full bg-wash text-[13.5px] font-semibold text-wash-foreground">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          <Editable card={card} field="title" value={card.title} />
        </div>
        <div className="text-[12.5px] text-muted-foreground">
          <Editable card={card} field="text" value={textOf(card)} />
        </div>
      </div>
      <Remove card={card} acts={acts} />
    </div>
  );
}

// The board, as a card of its own: connected once agreed.
export function BoardCard({
  card,
  acts,
}: Readonly<{ card: Card; acts: CardActs }>) {
  const t = useT();
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card px-5 py-4 shadow-card">
      <Icon card={card} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          <Editable card={card} field="title" value={card.title} />
        </div>
        <div className="text-[12.5px] text-muted-foreground">
          <Editable card={card} field="text" value={textOf(card)} />
        </div>
      </div>
      {card.confirmed && (
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#e6f6f3] px-2.5 text-xs font-medium text-[#0d7a6d]">
          <Check className="size-3" aria-hidden /> {t.setup.connected}
        </span>
      )}
      <Remove card={card} acts={acts} />
    </div>
  );
}

// A persona of the owner's own: who they are and what they do and want.
export function NewPersona({
  area,
  onProblem,
}: Readonly<{ area: string; onProblem: (problem: string | null) => void }>) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button
        type="button"
        className="grid min-h-[150px] place-items-center rounded-xl text-muted-foreground shadow-[inset_0_0_0_1.5px_var(--border)] hover:text-foreground"
        onClick={() => {
          setOpen(true);
        }}
      >
        <span className="grid justify-items-center gap-1.5">
          <Plus className="size-[18px]" aria-hidden />
          {t.setup.cards.addCustomer}
        </span>
      </button>
    );
  return (
    <PersonaForm
      area={area}
      onProblem={onProblem}
      onDone={() => {
        setOpen(false);
      }}
    />
  );
}

function PersonaForm({
  area,
  onProblem,
  onDone,
}: Readonly<{
  area: string;
  onProblem: (problem: string | null) => void;
  onDone: () => void;
}>) {
  const t = useT();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const add = () => {
    onProblem(null);
    post("/api/setup/draft", { add: { area, title, text } }).then(
      onDone,
      (error: unknown) => {
        onProblem(messageOf(error));
      },
    );
  };
  return (
    <form
      className="grid gap-2 rounded-xl bg-card px-4 py-3.5 shadow-card"
      onSubmit={(event) => {
        event.preventDefault();
        add();
      }}
    >
      <label className="grid gap-1 text-xs text-muted-foreground">
        {t.setup.cards.who}
        <input
          className="h-9 rounded-lg bg-ground px-3 text-[13px] text-foreground outline-none"
          value={title}
          placeholder={t.setup.cards.whoExample}
          onChange={(event) => {
            setTitle(event.target.value);
          }}
        />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        {t.setup.cards.what}
        <textarea
          rows={2}
          className="rounded-lg bg-ground px-3 py-2 text-[13px] text-foreground outline-none"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" size="pill-sm" disabled={!title.trim()}>
          <Plus aria-hidden />
          {t.setup.cards.add}
        </Button>
        <Button type="button" size="pill-sm" variant="ring" onClick={onDone}>
          <X aria-hidden />
          {t.setup.cards.cancel}
        </Button>
      </div>
    </form>
  );
}
