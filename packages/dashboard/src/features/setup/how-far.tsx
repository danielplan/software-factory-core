// "How far is it?" on Your product: the kobold's guess chosen already, with
// its evidence beneath; choosing another tells the kobold, which writes the
// card again.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { type Card, messageOf, post } from "@/api/client";
import { cn } from "@/lib/utils";

import { STAGES, stageOf, textOf } from "./card-bits";

export function HowFar({ card }: Readonly<{ card: Card }>) {
  const t = useTranslation().t;
  const guess = stageOf(card);
  const [chosen, choose] = useState<string>(guess);
  const [problem, setProblem] = useState<string | null>(null);
  const pick = (stage: string) => {
    choose(stage);
    setProblem(null);
    if (stage === guess) return;
    post("/api/setup/say", {
      text: `How far it is: ${stage}.\\n\\n(About: ${card.title} [${card.id}])\\n\\n(On the step: Your product)`,
    }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="grid gap-2.5 rounded-xl bg-card px-5 py-[18px] shadow-card">
      <span className="font-semibold">{t("setup.howFar")}</span>
      <div
        role="radiogroup"
        className="flex w-fit flex-wrap gap-0.5 rounded-[14px] bg-[#eceef2] p-1"
      >
        {STAGES.map((stage) => (
          <button
            key={stage}
            type="button"
            role="radio"
            aria-checked={chosen === stage}
            className={cn(
              "h-[34px] rounded-[10px] px-3.5 text-[13px] font-medium text-muted-foreground",
              chosen === stage && "bg-card text-foreground shadow-sm",
            )}
            onClick={() => {
              pick(stage);
            }}
          >
            {t(`setup.stages.${stage}`)}
          </button>
        ))}
      </div>
      <span className="text-xs text-faint">
        {t("setup.myGuess", { text: textOf(card) })}
      </span>
      {problem && (
        <span className="text-[13px] text-destructive">{problem}</span>
      )}
    </div>
  );
}
