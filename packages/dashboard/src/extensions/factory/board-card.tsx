// A card on the Factory board, opened beside it on a click; while the
// builder is on it, what it is doing right now; handed back from Stuck, that
// the owner's hint is with the builder; when its pull request clashes with
// main, Resolve.

import {
  ArrowUpRight,
  FlaskConical,
  GitPullRequest,
  LoaderCircle,
  MessageCircle,
} from "lucide-react";
import { createContext, use } from "react";
import { useTranslation } from "react-i18next";

import type { FactoryCard } from "@/api/client";
import { cn } from "@/lib/utils";

import { TypeChip } from "@/components/card-type";
import { NameTag } from "@/components/meet/name-tag";
import { builderTag } from "@/lib/meet-view";
import { ConflictBox, ResolvingLine } from "./conflict-box";

// A card on the board: it rises in after the ones above it, lifts under the
// pointer, and a click opens it beside the board (card-panel.tsx). While it
// is being built, a light runs along its top and it says Building.
export function Card({
  card,
  at,
  now,
}: Readonly<{ card: FactoryCard; at: number; now: string | null }>) {
  const t = useTranslation().t;
  const open = use(OpenCard);
  const building = now !== null;
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open(card.number);
        }
      }}
      className="relative flex flex-none cursor-pointer flex-col items-start gap-1.5 overflow-hidden rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors duration-150 ease-out hover:border-[#d4d4da] motion-safe:animate-rise"
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
            {t("factory.card.building")}
          </span>
        )}
      </span>
      <span className="text-[13px] leading-[1.35] font-medium">
        {card.title}
      </span>
      {building && (
        <NameTag id="builder" line={builderTag(card.number, now, t)} />
      )}
      {card.hint && !building && (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-wash px-2 py-1 text-xs leading-snug font-medium text-wash-foreground">
          <MessageCircle
            aria-hidden
            strokeWidth={2}
            className="size-3 flex-none"
          />
          {t("factory.card.hintWithBuilder")}
        </span>
      )}
      {(card.type ?? card.fix) && (
        <span className="flex w-full min-w-0 flex-wrap gap-1.5">
          <TypeChip type={card.type ?? null} />
          {card.fix && (
            <span className="inline-flex h-[22px] items-center rounded-md bg-type-bug/10 px-2.5 text-xs font-medium text-type-bug">
              {t("factory.card.fix")}
            </span>
          )}
        </span>
      )}
      <Origin card={card} />
      <PullRequest card={card} building={building} />
    </div>
  );
}

// Opens a card beside the board.
export const OpenCard = createContext<(number: number) => void>(
  () => undefined,
);

// The card's pull request, in the colour of its state, and Resolve when it
// clashes with main in Review; once asked (back in To do or Building), a
// quiet line that the builder is settling it.
function PullRequest({
  card,
  building,
}: Readonly<{ card: FactoryCard; building: boolean }>) {
  return (
    <>
      <PullRequestLink
        url={card.pullRequest}
        state={card.conflict ? "conflict" : (card.pullRequestState ?? null)}
      />
      {card.conflict && !building && <ConflictBox number={card.number} />}
      {card.resolving && <ResolvingLine />}
    </>
  );
}

// How a pull request's button looks in each state: green when it is ready
// for review, grey as a draft or closed, purple once merged, red when it
// clashes with main.
const PR_LOOKS: Record<PrLook, string> = {
  open: "border-success/30 bg-success/8 text-solved-foreground",
  draft: "border-border bg-card text-muted-foreground",
  merged: "border-merged/30 bg-merged/8 text-merged",
  closed: "border-border bg-card text-muted-foreground line-through",
  conflict: "border-type-bug/30 bg-type-bug/8 text-type-bug",
};
type PrLook = "open" | "draft" | "merged" | "closed" | "conflict";

// The card's pull request, a click away, without opening the card, in the
// colour of its state.
function PullRequestLink({
  url,
  state,
}: Readonly<{ url: string | null; state: PrLook | null }>) {
  const t = useTranslation().t;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title={state ? t(`factory.prStates.${state}`) : undefined}
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={cn(
        "inline-flex h-[24px] items-center gap-1.5 rounded-md border px-2 text-xs font-medium hover:brightness-95",
        PR_LOOKS[state ?? "draft"],
      )}
    >
      <GitPullRequest aria-hidden className="size-3.5" />
      {t("factory.panel.pullRequest")}
      <ArrowUpRight aria-hidden className="size-3 opacity-60" />
    </a>
  );
}

// The exploration a card was handed off from, as one quiet line; nothing
// when the card has its title already.
function Origin({ card }: Readonly<{ card: FactoryCard }>) {
  const t = useTranslation().t;
  if (!card.from || card.from.title === card.title) return null;
  return (
    <span
      title={t("factory.card.from", { title: card.from.title })}
      className="flex w-full min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
    >
      <FlaskConical aria-hidden strokeWidth={2} className="size-3 flex-none" />
      <span className="truncate">
        {t("factory.card.fromShort", { title: card.from.title })}
      </span>
    </span>
  );
}
