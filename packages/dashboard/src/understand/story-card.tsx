// A story as a card: small under its persona on the overview, wider on the
// persona's page (with where it came from). Each says its title, where it
// breaks, and where it stands: Open or Solved, or what is being tried for
// its problem. A new story the kobold started has a coloured outline, one
// assumed from an idea a dashed border, and one that turned out wrong is
// crossed out.

import type { StoryCard } from "@/api";
import { understandHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { Pill } from "./bits";
import { markOf, originWords } from "./view";

function frame(card: StoryCard): string {
  return cn(
    "grid gap-1.5 rounded-xl bg-card px-3.5 py-3 text-left shadow-soft transition-shadow hover:shadow-lift",
    card.isNew && "ring-2 ring-fresh",
    "idea" in card.from &&
      card.wrong === null &&
      "border-[1.5px] border-dashed border-faint shadow-none",
    card.wrong !== null && "bg-surface opacity-75",
  );
}

function Title({ card }: Readonly<{ card: StoryCard }>) {
  return (
    <span className="flex items-start gap-2">
      <span
        className={cn(
          "flex-1 text-sm leading-snug font-semibold",
          card.wrong !== null && "text-muted-foreground line-through",
        )}
      >
        {card.title}
      </span>
      {card.isNew && (
        <span className="rounded-full bg-open px-2 py-0.5 text-[11px] font-semibold text-open-foreground">
          new
        </span>
      )}
      {"idea" in card.from && card.wrong === null && (
        <span className="text-[11px] text-label">assumed</span>
      )}
    </span>
  );
}

// What it breaks at, or why it did not hold.
function Breaks({
  card,
  wide = false,
}: Readonly<{ card: StoryCard; wide?: boolean }>) {
  const text = card.wrong ?? `Breaks: ${card.problemTitle ?? "not clear yet"}`;
  return (
    <span
      className={cn("text-label", wide ? "text-[13px]" : "truncate text-xs")}
      title={text}
    >
      {text}
    </span>
  );
}

// Open or Solved, or what is tried for its problem.
function Mark({ card }: Readonly<{ card: StoryCard }>) {
  const { pill, note } = markOf(card);
  if (pill) return <Pill tone={pill.tone}>{pill.words}</Pill>;
  if (note)
    return <span className="text-xs text-muted-foreground">{note}</span>;
  return null;
}

export function StoryTile({ card }: Readonly<{ card: StoryCard }>) {
  return (
    <a href={understandHash(card.persona, card.id)} className={frame(card)}>
      <Title card={card} />
      <Breaks card={card} />
      <span className="flex min-h-6 items-center">
        <Mark card={card} />
      </span>
    </a>
  );
}

export function StoryRow({ card }: Readonly<{ card: StoryCard }>) {
  return (
    <a
      href={understandHash(card.persona, card.id)}
      className={cn(frame(card), "gap-2 px-5 py-4")}
    >
      <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="flex-1">
          <Title card={card} />
        </span>
        <span className="text-xs text-label">{originWords(card.from)}</span>
      </span>
      <Breaks card={card} wide />
      <span className="flex min-h-6 items-center">
        <Mark card={card} />
      </span>
    </a>
  );
}
