// How a card Kobble knows looks on the board: its kind (Idea · B, Fix,
// Update) and number above the title, what it is for below it (or where a
// fix came from), and at the bottom, for an idea, where it is on the
// idea's pipeline (Building → In the app → Worked) with "Close · did it
// work?" while it waits for the answer.

import type { CardView, TicketView } from "@/api";
import { StageSteps } from "@/components/stage-steps";
import { Button } from "@/components/ui/button";
import { ticketSteps } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { Pill } from "@/understand/bits";

import { t } from "../i18n/i18n.ts";
import { forOf, kindTone, outcomeOf, ticketStage } from "./view";

export function TicketHead({ ticket }: Readonly<{ ticket: TicketView }>) {
  return (
    <span className="flex items-center gap-2">
      <Pill tone={kindTone(ticket.kind)}>{ticket.label}</Pill>
      <span className="ml-auto text-tag text-muted-foreground">
        #{String(ticket.issue)}
      </span>
    </span>
  );
}

// "For: …", each problem linking to the story that breaks at it in
// Understand; or where a fix came from.
export function TicketFor({
  ticket,
  small = false,
}: Readonly<{ ticket: TicketView; small?: boolean }>) {
  const { lead, parts } = forOf(ticket);
  return (
    <p
      className={cn("text-muted-foreground", small ? "text-tag" : "text-body")}
    >
      {lead && `${lead} `}
      {parts.map((part, at) => (
        <span key={part.title}>
          {at > 0 && ", "}
          {part.href ? (
            <a
              href={part.href}
              className="text-foreground underline underline-offset-2"
            >
              {part.title}
            </a>
          ) : (
            part.title
          )}
        </span>
      ))}
    </p>
  );
}

export function TicketFoot({
  card,
  ticket,
  onAsk,
}: Readonly<{ card: CardView; ticket: TicketView; onAsk: () => void }>) {
  if (ticket.kind !== "idea") return null;
  const { outcome } = ticket;
  return (
    <>
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <StageSteps steps={ticketSteps(ticketStage(card, ticket))} />
        {outcome && (
          <span className="text-tag text-label">
            {outcome.worked === "unchecked"
              ? `${outcomeOf(outcome).words} · `
              : ""}
            {t("build:ticket.answeredBy", { by: outcome.by, on: outcome.on })}
          </span>
        )}
      </span>
      {card.asks && !outcome && (
        <Button size="sm" className="w-full" onClick={onAsk}>
          {t("build:ticket.close")}
        </Button>
      )}
    </>
  );
}
