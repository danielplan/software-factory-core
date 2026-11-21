// The kobold at the top of a step, as in the design: one sentence about the
// step, or its open questions about it, each with a small field to answer
// it. There is no chat: the owner corrects cards in place.

import { useState } from "react";

import { type Card, type CoachView, messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";

import { cardsIn, type Step } from "./steps";
import { useT } from "@/i18n/use-t";

export function KoboldSays({
  coach,
  step,
}: Readonly<{ coach: CoachView; step: Step }>) {
  const t = useT();
  const open = cardsIn(coach.draft, step.area).filter(
    (card) => card.tone === "question" && !card.confirmed,
  );
  return (
    <div className="flex items-start gap-3">
      <KoboldHead size={40} />
      <div className="grid max-w-[640px] min-w-0 gap-3 rounded-[4px_16px_16px_16px] bg-card px-4 py-3 text-[14.5px] leading-relaxed shadow-card">
        {open.length === 0 ? (
          <p>
            {coach.working
              ? t.setup.says.changing
              : (((t.setup.says as Record<string, unknown>)[step.id] as
                  string | undefined) ?? "")}
          </p>
        ) : (
          open.map((card) => <Question key={card.id} card={card} step={step} />)
        )}
      </div>
    </div>
  );
}

// One of the kobold's questions, answered in place.
function Question({ card, step }: Readonly<{ card: Card; step: Step }>) {
  const t = useT();
  const [answer, setAnswer] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const send = () => {
    setProblem(null);
    post("/api/setup/say", {
      text: `${answer.trim()}\n\n(About: ${card.title} [${card.id}])\n\n(On the step: ${step.area ?? step.name})`,
    }).then(
      () => {
        setAnswer("");
      },
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  };
  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <p>
        <b className="font-semibold">
          {/[.?!]$/.test(card.title) ? card.title : `${card.title}.`}
        </b>{" "}
        <Markdown text={card.text ?? ""} inline />
      </p>
      <div className="flex gap-2">
        <input
          aria-label={t.setup.says.answerOn(card.title)}
          className="h-9 min-w-0 flex-1 rounded-xl bg-ground px-3 text-[13.5px] outline-none"
          placeholder={t.setup.says.yourAnswer}
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
          }}
        />
        <Button type="submit" size="pill-sm" disabled={!answer.trim()}>
          {t.setup.says.answer}
        </Button>
      </div>
      {problem && <p className="text-[13px] text-destructive">{problem}</p>}
    </form>
  );
}
