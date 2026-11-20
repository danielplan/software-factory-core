// A card on the Factory board, opened beside it on a click; while the
// builder is on it, what it is doing right now.

import { FlaskConical, LoaderCircle } from "lucide-react";
import { createContext, use } from "react";

import type { FactoryCard } from "@/api";

import { TypeChip } from "./card-type";

// A card on the board: it rises in after the ones above it, lifts under the
// pointer, and a click opens it beside the board (card-panel.tsx). While it
// is being built, a light runs along its top and it says Building.
export function Card({
  card,
  at,
  now,
}: Readonly<{ card: FactoryCard; at: number; now: string | null }>) {
  const open = use(OpenCard);
  const building = now !== null;
  return (
    <button
      type="button"
      className="relative flex flex-none flex-col items-start gap-1.5 overflow-hidden rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:border-[#d4d4da] motion-safe:animate-rise"
      style={{ animationDelay: `${String(Math.min(at, 8) * 45)}ms` }}
      onClick={() => {
        open(card.number);
      }}
    >
      {building && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-blue/15"
        >
          <span className="block h-full w-2/5 bg-blue motion-safe:animate-run-light" />
        </span>
      )}
      <span className="flex w-full items-center gap-2 text-xs text-muted-foreground">
        #{card.number}
        {building && (
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-blue">
            <LoaderCircle aria-hidden className="size-3 animate-spin" />
            Building
          </span>
        )}
      </span>
      <span className="text-[13px] leading-[1.35] font-medium">
        {card.title}
      </span>
      {now && (
        <span
          title={now}
          className="line-clamp-2 w-full rounded-md bg-blue/8 px-2 py-1 text-xs leading-snug text-blue"
        >
          {now}
        </span>
      )}
      {(card.type ?? card.fix) && (
        <span className="flex w-full min-w-0 flex-wrap gap-1.5">
          <TypeChip type={card.type ?? null} />
          {card.fix && (
            <span className="inline-flex h-[22px] items-center rounded-md bg-type-bug/10 px-2.5 text-xs font-medium text-type-bug">
              Fix
            </span>
          )}
        </span>
      )}
      <Origin card={card} />
    </button>
  );
}

// Opens a card beside the board.
export const OpenCard = createContext<(number: number) => void>(
  () => undefined,
);

// The exploration a card was handed off from, as one quiet line; nothing
// when the card has its title already.
function Origin({ card }: Readonly<{ card: FactoryCard }>) {
  if (!card.from || card.from.title === card.title) return null;
  return (
    <span
      title={`From the exploration “${card.from.title}”`}
      className="flex w-full min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
    >
      <FlaskConical aria-hidden strokeWidth={2} className="size-3 flex-none" />
      <span className="truncate">From “{card.from.title}”</span>
    </span>
  );
}
