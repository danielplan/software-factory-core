// Stuck: cards the builder gave up on (a question it could not answer,
// checks that stayed red after three tries, an answer it waits for). Each
// says why in one plain line and how long it has been stuck. The main way
// on is helping the builder: answer it or give it a hint (for a question,
// its suggested answers are quick picks) and send, which puts the card at
// the top of To do with a chip "Your hint is with the builder" (variant B
// also quotes the reply on it; in variant A the reply belongs in the card's
// conversation, not on its face). In the Stuck column (variant B)
// two quiet links stay under it: "Try again as it is" (back to To do, no
// hint) and "I'll do it myself" (to Building as a person's, so the builder
// leaves it alone). The list above the board (variant A) has only the box.
// Shown on this page only, not on GitHub or Jira.
//
// Prototype: the stuck cards are made up, so they show without a board.

import { Check, CircleAlert, Send } from "lucide-react";
import { useState } from "react";

import type { FactoryCard, FactoryView } from "@/api";
import { Button } from "@/components/ui/button";
import { FIELD_AREA } from "@/lib/field-style";
import { cn } from "@/lib/utils";

// One answer the builder suggests to its own question.
type Pick = { key: string; answer: string };

export type Stuck = {
  card: FactoryCard;
  reason: string;
  since: string;
  // For a card stuck on a question: the answers the builder suggests.
  picks?: { answers: Pick[]; suggested: string };
};

// Made up, for trying the prototype.
const MADE_UP: Stuck[] = [
  {
    card: madeUp(214, "Let customers pay by bank transfer"),
    reason: "The builder got stuck on a question: which bank should it use?",
    since: "2 hours",
    picks: {
      answers: [
        { key: "A", answer: "The bank the shop already uses" },
        { key: "B", answer: "A payment service that handles transfers" },
        { key: "C", answer: "Show our account details, check by hand" },
      ],
      suggested: "B",
    },
  },
  {
    card: madeUp(209, "Show the delivery date on every order"),
    reason: "The checks stayed red after three tries.",
    since: "1 day",
  },
  {
    card: madeUp(221, "Send a reminder before a trial ends"),
    reason: "Waiting for an answer from you since yesterday.",
    since: "20 hours",
  },
];

function madeUp(number: number, title: string): FactoryCard {
  return {
    number,
    title,
    url: "",
    from: null,
    fix: false,
    type: null,
  };
}

// Where a stuck card goes: back to To do for the builder, with a hint or
// as it is, or to Building as a person's.
export type Move = { to: "todo"; hint: string | null } | { to: "mine" };

// The stuck cards, and where the ones taken on went.
export function useStuck() {
  const [stuck, setStuck] = useState(MADE_UP);
  const [moved, setMoved] = useState<{
    todo: { card: FactoryCard; hint: string | null }[];
    mine: FactoryCard[];
  }>({ todo: [], mine: [] });
  const move = (number: number, how: Move) => {
    const one = stuck.find((card) => card.card.number === number);
    if (!one) return;
    setStuck((was) => was.filter((card) => card.card.number !== number));
    setMoved((was) =>
      how.to === "todo"
        ? { ...was, todo: [{ card: one.card, hint: how.hint }, ...was.todo] }
        : { ...was, mine: [one.card, ...was.mine] },
    );
  };
  return { stuck, moved, move };
}

export type StuckState = ReturnType<typeof useStuck>;

// The board with the cards taken on from Stuck in their columns, on top.
export function withMoved(view: FactoryView, stuck: StuckState): FactoryView {
  const todo = stuck.moved.todo.map((one) => one.card);
  const { mine } = stuck.moved;
  return {
    ...view,
    columns: view.columns.map((column) => {
      if (column.id === "todo")
        return { ...column, cards: [...todo, ...column.cards] };
      if (column.id === "building")
        return { ...column, cards: [...mine, ...column.cards] };
      return column;
    }),
  };
}

// The numbers of the cards that are a person's.
export function minesOf(stuck: StuckState): number[] {
  return stuck.moved.mine.map((card) => card.number);
}

// What the person told the builder, by card number.
export function hintsOf(stuck: StuckState): Record<number, string> {
  const hints: Record<number, string> = {};
  for (const one of stuck.moved.todo)
    if (one.hint) hints[one.card.number] = one.hint;
  return hints;
}

export const STUCK_COLOUR = "#d9534f";

// One stuck card: number, title, why, how long; then the box to help the
// builder, and the two quiet links unless `boxOnly`.
export function StuckCard({
  one,
  onMove,
  boxOnly = false,
}: Readonly<{
  one: Stuck;
  onMove: (how: Move) => void;
  boxOnly?: boolean;
}>) {
  const [hint, write] = useState("");
  const said = hint.trim();
  return (
    <article className="flex flex-none flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 motion-safe:animate-rise">
      <p className="flex w-full items-center gap-2 text-xs text-muted-foreground">
        #{one.card.number}
        <span className="ml-auto font-medium" style={{ color: STUCK_COLOUR }}>
          Stuck for {one.since}
        </span>
      </p>
      <p className="text-[13px] leading-[1.35] font-medium">{one.card.title}</p>
      <p className="flex items-start gap-1.5 text-xs leading-snug text-muted-foreground">
        <CircleAlert
          aria-hidden
          className="mt-px size-3.5 flex-none"
          style={{ color: STUCK_COLOUR }}
        />
        {one.reason}
      </p>
      {one.picks && <QuickPicks picks={one.picks} said={said} onPick={write} />}
      <textarea
        aria-label={`Answer the builder on card #${String(one.card.number)}`}
        placeholder="Answer the builder, or give it a hint"
        value={hint}
        onChange={(event) => {
          write(event.target.value);
        }}
        rows={2}
        className={cn(FIELD_AREA, "mt-1 resize-y text-xs")}
      />
      <Button
        size="pill-sm"
        className="self-start"
        disabled={!said}
        onClick={() => {
          onMove({ to: "todo", hint: said });
        }}
      >
        <Send aria-hidden className="size-3.5" />
        Send and let it try again
      </Button>
      {!boxOnly && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <QuietLink
            onClick={() => {
              onMove({ to: "todo", hint: null });
            }}
          >
            Try again as it is
          </QuietLink>
          <QuietLink
            onClick={() => {
              onMove({ to: "mine" });
            }}
          >
            I'll do it myself
          </QuietLink>
        </p>
      )}
    </article>
  );
}

// The builder's suggested answers, as quick picks that fill the box.
function QuickPicks({
  picks,
  said,
  onPick,
}: Readonly<{
  picks: NonNullable<Stuck["picks"]>;
  said: string;
  onPick: (answer: string) => void;
}>) {
  return (
    <div
      role="radiogroup"
      aria-label="Pick an answer"
      className="mt-1 grid gap-1"
    >
      {picks.answers.map((pick) => {
        const on = said === pick.answer;
        return (
          <button
            key={pick.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              onPick(pick.answer);
            }}
            className={cn(
              "flex items-start gap-2 rounded-lg border bg-card px-2.5 py-1.5 text-left text-xs",
              on ? "border-foreground/40 bg-wash" : "border-border",
            )}
          >
            <span className="w-3 font-semibold">{pick.key}</span>
            <span className="flex-1 leading-snug">{pick.answer}</span>
            {picks.suggested === pick.key && !on && (
              <span className="rounded-full bg-panel px-1.5 py-px text-[11px] text-muted-foreground">
                Suggested
              </span>
            )}
            {on && <Check aria-hidden className="size-3.5 flex-none" />}
          </button>
        );
      })}
    </div>
  );
}

function QuietLink({
  onClick,
  children,
}: Readonly<{ onClick: () => void; children: string }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="underline decoration-current/30 underline-offset-2 hover:text-foreground"
    >
      {children}
    </button>
  );
}

// Variant A: a list above the board, next to "Waiting for you".
export function StuckList({ stuck }: Readonly<{ stuck: StuckState }>) {
  if (stuck.stuck.length === 0) return null;
  return (
    <section
      aria-label="Stuck"
      className="grid gap-3 rounded-xl border px-4 py-3.5"
      style={{
        backgroundColor: `color-mix(in srgb, ${STUCK_COLOUR} 5%, #fafafa)`,
        borderColor: `color-mix(in srgb, ${STUCK_COLOUR} 22%, #e6e6ea)`,
      }}
    >
      <header className="grid gap-0.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold">
          <CircleAlert
            aria-hidden
            className="size-[15px]"
            style={{ color: STUCK_COLOUR }}
          />
          <span style={{ color: STUCK_COLOUR }}>Stuck</span>
          <span className="text-xs font-normal text-muted-foreground">
            {stuck.stuck.length} cards the builder could not finish
          </span>
        </h2>
      </header>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {stuck.stuck.map((one) => (
          <StuckCard
            key={one.card.number}
            one={one}
            boxOnly
            onMove={(how) => {
              stuck.move(one.card.number, how);
            }}
          />
        ))}
      </div>
    </section>
  );
}
