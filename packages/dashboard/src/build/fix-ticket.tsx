// "Make a fix ticket" for a bug or an update sorted on Signals and sent to
// the Factory: it becomes a GitHub issue in Backlog, and the signal goes to
// it. On Signals under the signal, and on the Factory in the list of what
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

// Under a sorted signal: the button, when it went to the Factory.
export function FixTicketFor({ signal }: Readonly<{ signal: SignalView }>) {
  return signal.went?.to === "build" ? (
    <FixTicketButton signal={signal.id} />
  ) : null;
}

// What Signals sent to the Factory that has no ticket yet. On a phone the
// text takes its own full line, so it is never squeezed between the rest.
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
          <span className="order-last basis-full text-body [overflow-wrap:anywhere] sm:order-none sm:min-w-0 sm:flex-1 sm:basis-0">
            {fix.text}
          </span>
          <span className="text-tag text-muted-foreground">
            {t("build:fix.from", { source: fix.source })}
          </span>
          <FixTicketButton signal={fix.signal} />
        </div>
      ))}
    </section>
  );
}
