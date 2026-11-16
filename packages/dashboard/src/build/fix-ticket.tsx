// "Make a fix ticket" for a bug or an update sorted in Understand and sent
// to Build: it becomes a GitHub issue in Backlog, and the signal goes to
// it. On Understand under the signal, and on Build in the list of what
// waits for a ticket.

import { useState } from "react";

import { messageOf, post, type SignalView, type WaitingFix } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Pill } from "@/understand/bits";

import { kindTone } from "./view";

export function FixTicketButton({ signal }: Readonly<{ signal: string }>) {
  const [making, setMaking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const make = async () => {
    setMaking(true);
    setProblem(null);
    try {
      await post("/api/build/fix", { signal });
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setMaking(false);
    }
  };
  return (
    <>
      <Button
        variant="outline"
        size="xs"
        disabled={making}
        onClick={() => void make()}
      >
        {making ? "Making the ticket…" : "Make a fix ticket"}
      </Button>
      {problem && <ProblemBox title="No ticket was made" text={problem} />}
    </>
  );
}

// Under a sorted signal: the button, when it went to Build.
export function FixTicketFor({ signal }: Readonly<{ signal: SignalView }>) {
  return signal.went?.to === "build" ? (
    <FixTicketButton signal={signal.id} />
  ) : null;
}

// What Understand sent to Build that has no ticket yet.
export function WaitingFixes({ waiting }: Readonly<{ waiting: WaitingFix[] }>) {
  if (waiting.length === 0) return null;
  return (
    <section
      aria-label="Sent from Understand"
      className="grid gap-2 rounded-2xl bg-surface-2/60 p-3"
    >
      <h2 className="px-1 text-[13px] font-semibold">
        Sent from Understand, waiting for a ticket
      </h2>
      {waiting.map((fix) => (
        <div
          key={fix.signal}
          className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-2.5 shadow-soft"
        >
          <Pill tone={kindTone(fix.kind)}>
            {fix.kind === "update" ? "Update" : "Fix"}
          </Pill>
          <span className="min-w-0 flex-1 text-sm">{fix.text}</span>
          <span className="text-xs text-muted-foreground">
            From: {fix.source}
          </span>
          <FixTicketButton signal={fix.signal} />
        </div>
      ))}
    </section>
  );
}
