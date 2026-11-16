// What Build adds to the board from the records: the issues Kobble knows
// (read again whenever the records change), the "did it work?" dialog for
// the card being closed, the line that says what the answer changed, and
// what Understand sent to Build that waits for a ticket.

import { useState } from "react";

import type { Answered, BuildView, CardView, TicketView } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { cn } from "@/lib/utils";
import { KoboldMark } from "@/understand/bits";
import { type Read, useRead } from "@/understand/use-records";

import { DidItWork } from "./did-it-work";
import { WaitingFixes } from "./fix-ticket";
import { saidOf } from "./view";

type Asking = { ticket: TicketView; title: string };

export function useBuild() {
  const { data } = useRead("/api/build") as Read<BuildView>;
  const [asking, setAsking] = useState<Asking | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const tickets = new Map(data?.tickets.map((t) => [t.issue, t]) ?? []);
  const ask = (card: CardView) => {
    const ticket = tickets.get(card.number);
    if (ticket) setAsking({ ticket, title: card.title });
  };
  const said = answered && saidOf(answered);
  const shown = (
    <>
      {said && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm",
            said.good ? "bg-success/15" : "bg-surface-2",
          )}
        >
          <KoboldMark className="size-6" />
          {said.text}
        </div>
      )}
      {answered?.problem && (
        <ProblemBox title="Not on GitHub" text={answered.problem} />
      )}
      <WaitingFixes waiting={data?.waiting ?? []} />
      {asking && (
        <DidItWork
          ticket={asking.ticket}
          title={asking.title}
          onClose={() => {
            setAsking(null);
          }}
          onAnswered={(answer) => {
            setAsking(null);
            setAnswered(answer);
          }}
        />
      )}
    </>
  );
  return { tickets, ask, shown };
}
