// The guided setup's welcome: what the kobold read, step by step.

import type { TFunction } from "i18next";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { State } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { cardsIn, stepsOf } from "./steps";

type SetupState = Extract<State, { mode: "setup" }>;

// The welcome: what the kobold read, step by step, while it reads and once
// it is done; no question here, they wait in the steps they are about.
export function Welcome({ coach }: Readonly<{ coach: SetupState["coach"] }>) {
  const t = useTranslation().t;
  const steps = stepsOf(coach.draft).filter((step) => step.area);
  const reading = coach.working;
  return (
    <div className="grid gap-6">
      <div className="grid justify-items-center gap-3 pt-6 text-center">
        <KoboldHead size={88} />
        <h1 className="text-2xl font-semibold tracking-[-0.015em]">
          {t("setup.hi")}
        </h1>
        <p className="max-w-[56ch] text-muted-foreground">
          {reading ? (coach.activity ?? t("setup.reading")) : t("setup.read")}
        </p>
      </div>
      <ul className="grid rounded-xl bg-card shadow-card">
        {steps.map((step) => {
          const cards = cardsIn(coach.draft, step.area);
          const open = cards.filter(
            (c) => c.tone === "question" && !c.confirmed,
          ).length;
          return (
            <li
              key={step.id}
              className="flex items-center gap-3 border-t border-border-soft px-5 py-3.5 first:border-t-0"
            >
              {cards.length > 0 ? (
                <Check
                  className="size-[18px] rounded-full bg-[#12a594] p-0.5 text-white"
                  aria-hidden
                />
              ) : (
                <span
                  className={cn(
                    "size-[18px] rounded-full",
                    reading
                      ? "animate-pulse bg-muted"
                      : "shadow-[inset_0_0_0_1.5px_var(--border)]",
                  )}
                />
              )}
              <span className="grid">
                <span className="font-semibold">
                  {(
                    t("setup.steps", { returnObjects: true }) as Record<
                      string,
                      { name: string } | undefined
                    >
                  )[step.id]?.name ?? step.name}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {foundLine(cards.length, open, reading, t)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// What the kobold found for a step, in a few words.
function foundLine(
  cards: number,
  open: number,
  reading: boolean,
  m: TFunction,
): string {
  if (cards === 0)
    return reading ? m("setup.found.reading") : m("setup.found.nothing");
  const found = m("setup.found.cards", { count: cards });
  if (open === 0) return found;
  return m("setup.found.questions", { found, count: open });
}
