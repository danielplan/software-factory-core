// Prototype: the ways something new gets into the factory, one per variant,
// on a made-up board (no GitHub board needed to try them).
// A: a form on the Factory page; a request lands in To do as a card.
// B: one inbox, any source; the small ones can go straight to To do.
// C: every error from the live app becomes a card in To do at once;
//    requests are added by hand.

import { Bug } from "lucide-react";
import { type ReactNode, useState } from "react";

import type { FactoryView } from "@/api";
import { variant } from "@/lib/variant";
import { Toast } from "@/signals/bits";

import type { ShownCard } from "./board-card";
import { Inbox } from "./inbox";
import { useLiveErrors } from "./live-errors";
import {
  type Arrival,
  FIRST_ARRIVALS,
  FIRST_ERRORS,
  madeCard,
  madeUpBoard,
  nextNumber,
  withToDo,
} from "./made-up";
import { NewRequest, type Request } from "./new-request";

export type WaysIn = {
  view: FactoryView;
  // In the page's header, beside the builder.
  actions: ReactNode;
  // Between the header and the columns.
  above: ReactNode;
};

const MADE_UP_NOTE = (
  <span className="rounded-md bg-wash px-2 py-1 text-[11.5px] font-medium text-wash-foreground">
    Made-up board
  </span>
);

export function useWaysIn(): WaysIn {
  const shown = variant();
  const [view, setView] = useState<FactoryView>(() =>
    shown === "C" ? withErrors(madeUpBoard()) : madeUpBoard(),
  );
  const [arrivals, setArrivals] = useState<Arrival[]>(FIRST_ARRIVALS);
  const [said, say] = useState<string | null>(null);

  const addCard = (title: string, more: Partial<ShownCard>) => {
    setView((was) => withToDo(was, madeCard(nextNumber(was), title, more)));
  };
  const request = ({ title, type }: Request) => {
    addCard(title, { came: "request", by: "you", type });
    say(`“${title}” is in To do`);
  };

  useLiveErrors((title) => {
    if (shown === "C") {
      setView((was) => errorOnBoard(was, title));
      say("An error from the live app landed on the board");
    }
    if (shown === "B") {
      setArrivals((was) => [
        {
          id: `in-${String(Date.now())}`,
          came: "error",
          title,
          from: "Shop, live",
          small: true,
          times: 1,
        },
        ...was.filter((one) => one.title !== title),
      ]);
    }
  });

  const gone = (arrival: Arrival) => {
    setArrivals((was) => was.filter((one) => one.id !== arrival.id));
  };
  const toast = said && (
    <Toast
      text={said}
      onOk={() => {
        say(null);
      }}
    />
  );

  if (shown === "B")
    return {
      view,
      actions: MADE_UP_NOTE,
      above: (
        <>
          <Inbox
            arrivals={arrivals}
            onAdd={(title) => {
              setArrivals((was) => [
                {
                  id: `in-${String(Date.now())}`,
                  came: "request",
                  title,
                  from: "you",
                  small: title.split(/\s+/).length <= 12,
                },
                ...was,
              ]);
            }}
            onToDo={(arrival) => {
              gone(arrival);
              addCard(arrival.title, {
                came: arrival.came,
                times: arrival.times,
                by: arrival.from,
                type: arrival.came === "error" ? "bug" : "feature",
                fix: arrival.came === "error",
              });
              say(`“${arrival.title}” is in To do`);
            }}
            onExplore={(arrival) => {
              gone(arrival);
              say(`“${arrival.title}” waits in Explorations`);
            }}
            onDismiss={(arrival) => {
              gone(arrival);
              say("Dismissed");
            }}
          />
          {toast}
        </>
      ),
    };

  return {
    view,
    actions: (
      <>
        {MADE_UP_NOTE}
        <NewRequest
          words={shown === "C" ? "Add a card" : "New request"}
          onAdd={request}
        />
      </>
    ),
    above: (
      <>
        {shown === "C" && <ErrorsLine />}
        {toast}
      </>
    ),
  };
}

// C: the line saying errors come in by themselves.
function ErrorsLine() {
  return (
    <p className="mb-3 flex items-center gap-2 text-[12.5px] text-muted-foreground">
      <span className="relative grid size-5 place-items-center rounded-full bg-type-bug/10 text-type-bug">
        <Bug aria-hidden strokeWidth={2} className="size-3" />
        <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-type-bug motion-safe:animate-pulse" />
      </span>
      Errors from the live app land in To do by themselves. The same error
      again counts on its card.
    </p>
  );
}

function withErrors(view: FactoryView): FactoryView {
  return FIRST_ERRORS.reduceRight(
    (board, error) => withToDo(board, error),
    view,
  );
}

// C: a new error is a new card on top of To do; one seen already counts
// once more on its card.
function errorOnBoard(view: FactoryView, title: string): FactoryView {
  const todo = view.columns.find((column) => column.id === "todo");
  const seen = todo?.cards.find((one) => one.title === title) as
    | ShownCard
    | undefined;
  if (!seen)
    return withToDo(
      view,
      madeCard(nextNumber(view), title, {
        came: "error",
        times: 1,
        type: "bug",
        fix: true,
      }),
    );
  return {
    ...view,
    columns: view.columns.map((column) =>
      column.id === "todo"
        ? {
            ...column,
            cards: column.cards.map((one) =>
              one === seen ? { ...seen, times: (seen.times ?? 1) + 1 } : one,
            ),
          }
        : column,
    ),
  };
}
