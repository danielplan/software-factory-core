// "Make a fix ticket" for a bug or an update sorted in Understand and sent
// to Build: it becomes a GitHub issue in Backlog, and the signal goes to
// it. On Understand under the signal, and on Build in the list of what
// waits for a ticket.

import { useState } from "react";

import { messageOf, post, type SignalView, type WaitingFix } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Pill } from "@/understand/bits";

import { t } from "../i18n/i18n.ts";
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
        {making ? t("build:fix.making") : t("build:fix.make")}
      </Button>
      {problem && <ProblemBox title={t("build:fix.failed")} text={problem} />}
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
      aria-label={t("build:fix.waiting")}
      className="grid gap-2 rounded-2xl bg-surface-2/60 p-3"
    >
      <h2 className="px-1 text-item">{t("build:fix.waiting")}</h2>
      {waiting.map((fix) => (
        <div
          key={fix.signal}
          className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-2.5 shadow-soft"
        >
          <Pill tone={kindTone(fix.kind)}>
            {fix.kind === "update" ? t("build:fix.update") : t("build:fix.fix")}
          </Pill>
          <span className="min-w-0 flex-1 text-body">{fix.text}</span>
          <span className="text-tag text-muted-foreground">
            {t("build:fix.from", { source: fix.source })}
          </span>
          <FixTicketButton signal={fix.signal} />
        </div>
      ))}
    </section>
  );
}
