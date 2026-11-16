// A story as a card: small under its persona on the overview, wider on the
// persona's page (where it starts, what they want, where it came from).
// A new story the kobold started has a coloured outline, one assumed from
// an idea a dashed border, and one that turned out wrong is crossed out.

import type { StoryCard } from "@/api";
import { understandHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { Pill, Squares } from "./bits";
import { originWords, stateOf } from "./view";

function frame(card: StoryCard): string {
  return cn(
    "grid gap-2 rounded-2xl border bg-card px-4 py-3.5 text-left shadow-soft transition-shadow hover:shadow-md",
    card.isNew && "border-fresh ring-1 ring-fresh",
    "idea" in card.from && "border-2 border-dashed",
    card.wrong !== null && "bg-surface opacity-75",
  );
}

function Title({ card }: Readonly<{ card: StoryCard }>) {
  return (
    <span className="flex items-start gap-2">
      <span
        className={cn(
          "flex-1 text-[15px] leading-snug font-semibold",
          card.wrong !== null && "text-muted-foreground line-through",
        )}
      >
        {card.title}
      </span>
      {card.isNew && (
        <span className="rounded-full bg-fresh/12 px-2 py-0.5 text-[11px] font-semibold text-fresh">
          new
        </span>
      )}
      {"idea" in card.from && card.wrong === null && (
        <span className="text-[11px] text-muted-foreground">assumed</span>
      )}
    </span>
  );
}

// What it breaks at, or why it did not hold.
function Breaks({ card }: Readonly<{ card: StoryCard }>) {
  if (card.wrong !== null)
    return (
      <span className="text-[13px] text-muted-foreground">{card.wrong}</span>
    );
  return (
    <span className="line-clamp-2 text-[13px] text-muted-foreground">
      Breaks: {card.problemTitle ?? "not clear yet"}
    </span>
  );
}

export function StoryTile({ card }: Readonly<{ card: StoryCard }>) {
  const state = stateOf(card);
  return (
    <a href={understandHash(card.persona, card.id)} className={frame(card)}>
      <Title card={card} />
      <Breaks card={card} />
      <span className="flex items-center gap-2">
        <Pill tone={state.tone}>{state.words}</Pill>
        <span className="flex-1" />
        <Squares seen={card.seen} />
      </span>
    </a>
  );
}

export function StoryRow({ card }: Readonly<{ card: StoryCard }>) {
  const state = stateOf(card);
  const starts = [
    card.starts && `Starts: ${card.starts}`,
    card.wants && `Wants: ${card.wants}`,
  ].filter(Boolean);
  return (
    <a
      href={understandHash(card.persona, card.id)}
      className={cn(frame(card), "px-5 py-4")}
    >
      <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="flex-1">
          <Title card={card} />
        </span>
        <span className="text-xs text-muted-foreground">
          {originWords(card.from)}
        </span>
      </span>
      {starts.length > 0 && (
        <span className="text-sm">{starts.join(" · ")}</span>
      )}
      <span className="flex flex-wrap items-center gap-2 text-sm">
        {card.wrong === null ? (
          <>
            <span className="text-muted-foreground">Breaks:</span>
            <span className="font-medium">
              {card.problemTitle ?? "not clear yet"}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">{card.wrong}</span>
        )}
        <Pill tone={state.tone}>{state.words}</Pill>
      </span>
      <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <Squares seen={card.seen} />
        {card.known.seen} of {card.known.of} scenes seen
      </span>
    </a>
  );
}
