import { ArrowUpRight, GitPullRequest, Loader2 } from "lucide-react";

import type { CardView, TicketView } from "@/api";
import { TicketFoot, TicketFor, TicketHead } from "@/build/ticket-bits";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { t } from "../i18n/i18n.ts";
import { shortStep } from "./card-steps";
import { stageOf } from "./stages";

// What is done on a card now: planned (by the coach or the builder), built,
// or its review answered; and the steps so far.
export type Job = "plan" | "build" | "review";
export type Working = { job: Job; steps: string[] };

// The builder's job, from the words the server says it with.
export function jobOf(what: string): Job {
  if (what.startsWith("planning")) return "plan";
  return what.startsWith("answering") ? "review" : "build";
}

// A card from the connected board: its title and number, and, when the
// builder or the coach works on it, what it is doing in a few words. It
// opens a panel with the card's links and the steps so far. A card Kobble
// knows also says its kind and what it is for, and, once it is in the app,
// asks "did it work?" until a person answers.
export function BoardCard({
  card,
  working,
  ticket = null,
  onAsk,
}: Readonly<{
  card: CardView;
  working: Working | null;
  ticket?: TicketView | null;
  onAsk?: () => void;
}>) {
  const asking = Boolean(ticket && card.asks && !ticket.outcome);
  return (
    <div
      className={cn(
        "grid min-w-0 gap-1.5 rounded-xl bg-card p-3 shadow-soft transition-shadow hover:shadow-lift",
        working && "ring-2 ring-tint-line",
        asking && "ring-2 ring-foreground",
      )}
    >
      <Dialog>
        <DialogTrigger asChild>
          <button type="button" className="grid min-w-0 gap-1.5 text-left">
            {ticket && <TicketHead ticket={ticket} />}
            <span className="text-item break-words">{card.title}</span>
            {(working || !ticket) && (
              <CardStatus number={card.number} working={working} />
            )}
          </button>
        </DialogTrigger>
        <CardPanel card={card} working={working} />
      </Dialog>
      {ticket && (
        <>
          <TicketFor ticket={ticket} small />
          <TicketFoot card={card} ticket={ticket} onAsk={() => onAsk?.()} />
        </>
      )}
    </div>
  );
}

// What works on the card now, in a few words; or its number.
function CardStatus({
  number,
  working,
}: Readonly<{ number: number; working: Working | null }>) {
  const last = working?.steps.at(-1);
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-tag text-muted-foreground">
      {working ? (
        <>
          <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
          <span className="truncate">
            {last ? shortStep(last) : t(`build:working.${working.job}`)}
          </span>
        </>
      ) : (
        `#${String(number)}`
      )}
    </span>
  );
}

function CardPanel({
  card,
  working,
}: Readonly<{ card: CardView; working: Working | null }>) {
  const stage = card.stage ? stageOf(card.stage).title : card.column;
  return (
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="pr-6 leading-snug">{card.title}</DialogTitle>
        <DialogDescription>
          #{String(card.number)} · {stage || t("build:card.noColumn")}
          {working && " · "}
          {working && t(`build:working.${working.job}`)}
        </DialogDescription>
      </DialogHeader>
      {working && (
        <ol className="grid max-h-72 gap-1 overflow-y-auto rounded-lg bg-muted/60 p-3 text-tag">
          {working.steps.length === 0 && (
            <li className="text-muted-foreground">
              {t("build:card.starting")}
            </li>
          )}
          {working.steps.map((step, index) => (
            <li
              key={`${String(index)}-${step}`}
              className={cn(
                "break-words",
                index < working.steps.length - 1 && "text-muted-foreground",
              )}
            >
              {step}
            </li>
          ))}
        </ol>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={card.url} target="_blank" rel="noreferrer">
            <ArrowUpRight className="size-3.5" aria-hidden />
            {t("build:card.open")}
          </a>
        </Button>
        {card.pullRequest && (
          <Button asChild variant="outline">
            <a href={card.pullRequest} target="_blank" rel="noreferrer">
              <GitPullRequest className="size-3.5" aria-hidden />
              {t("build:card.pullRequest")}
            </a>
          </Button>
        )}
      </div>
    </DialogContent>
  );
}
