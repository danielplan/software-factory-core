// Stuck: cards the builder gave up on (a question it could not answer,
// checks that stayed red after three tries, an answer it waits for). Each
// says why in one plain line and how long it has been stuck, and offers two
// ways on: "Let the builder try again" puts it back in To do; "I'll take it"
// puts it in Building as a person's, so the builder leaves it alone.
// Shown on this page only, not on GitHub or Jira.
//
// Prototype: the stuck cards are made up, so they show without a board.

import { CircleAlert, Hand, RotateCcw } from "lucide-react";
import { useState } from "react";

import type { FactoryCard, FactoryView } from "@/api";
import { Button } from "@/components/ui/button";

export type Stuck = {
  card: FactoryCard;
  reason: string;
  since: string;
};

// Made up, for trying the prototype.
const MADE_UP: Stuck[] = [
  {
    card: madeUp(214, "Let customers pay by bank transfer"),
    reason: "The builder got stuck on a question: which bank should it use?",
    since: "2 hours",
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

// The stuck cards, and where the ones taken on went: back to To do for
// the builder, or to Building as a person's.
export function useStuck() {
  const [stuck, setStuck] = useState(MADE_UP);
  const [moved, setMoved] = useState<{
    todo: FactoryCard[];
    mine: FactoryCard[];
  }>({ todo: [], mine: [] });
  const move = (number: number, to: "todo" | "mine") => {
    const one = stuck.find((card) => card.card.number === number);
    if (!one) return;
    setStuck((was) => was.filter((card) => card.card.number !== number));
    setMoved((was) => ({ ...was, [to]: [one.card, ...was[to]] }));
  };
  return { stuck, moved, move };
}

export type StuckState = ReturnType<typeof useStuck>;

// The board with the cards taken on from Stuck in their columns.
export function withMoved(view: FactoryView, stuck: StuckState): FactoryView {
  const { todo, mine } = stuck.moved;
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

export const STUCK_COLOUR = "#d9534f";

// One stuck card: number, title, why, how long, and the two buttons.
export function StuckCard({
  one,
  onMove,
}: Readonly<{ one: Stuck; onMove: (to: "todo" | "mine") => void }>) {
  return (
    <article className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3 py-2.5 motion-safe:animate-rise">
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
      <div className="mt-1 flex flex-wrap gap-1.5">
        <Button
          size="pill-sm"
          variant="ring"
          onClick={() => {
            onMove("todo");
          }}
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Let the builder try again
        </Button>
        <Button
          size="pill-sm"
          onClick={() => {
            onMove("mine");
          }}
        >
          <Hand aria-hidden className="size-3.5" />
          I'll take it
        </Button>
      </div>
    </article>
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
            onMove={(to) => {
              stuck.move(one.card.number, to);
            }}
          />
        ))}
      </div>
    </section>
  );
}
