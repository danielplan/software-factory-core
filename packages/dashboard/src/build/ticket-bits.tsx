// How a card Kobble knows looks on the board: its kind (Idea · B, Fix,
// Update) and number above the title, what it is for below it (or where a
// fix came from), and at the bottom "Close · did it work?" while it waits
// for the answer, or the answer once given.

import type { TicketView } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pill } from "@/understand/bits";

import { forOf, kindTone, outcomeOf } from "./view";

export function TicketHead({ ticket }: Readonly<{ ticket: TicketView }>) {
  return (
    <span className="flex items-center gap-2">
      <Pill tone={kindTone(ticket.kind)}>{ticket.label}</Pill>
      <span className="ml-auto text-xs text-muted-foreground">
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
    <p className={cn("text-muted-foreground", small ? "text-xs" : "text-sm")}>
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
  ticket,
  asks,
  onAsk,
}: Readonly<{ ticket: TicketView; asks: boolean; onAsk: () => void }>) {
  if (ticket.outcome) {
    const { tone, words } = outcomeOf(ticket.outcome);
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Pill tone={tone}>{words}</Pill>
        {ticket.outcome.by}, {ticket.outcome.on}
      </span>
    );
  }
  if (!asks) return null;
  return (
    <Button size="sm" className="w-full" onClick={onAsk}>
      Close · did it work?
    </Button>
  );
}
