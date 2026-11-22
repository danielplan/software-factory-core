// The kobold at the top of a step, as in the design: one sentence about the
// step, or its open questions about it, each with a small field to answer
// it. There is no chat: the owner corrects cards in place.

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { type Card, type CoachView, messageOf, post } from "@/api/client";
import { FieldProblem } from "@/components/field-problem";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { answerSchema, markOf } from "@/lib/forms";

import { cardsIn, type Step } from "./steps";

export function KoboldSays({
  coach,
  step,
}: Readonly<{ coach: CoachView; step: Step }>) {
  const t = useTranslation().t;
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
              ? t("setup.says.changing")
              : (((
                  t("setup.says", { returnObjects: true }) as Record<
                    string,
                    unknown
                  >
                )[step.id] as string | undefined) ?? "")}
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
  const t = useTranslation().t;
  const form = useForm({
    resolver: zodResolver(answerSchema),
    defaultValues: { answer: "" },
    mode: "onTouched",
  });
  const answer = form.getFieldState("answer", form.formState);
  const why = `answer-${card.id}-problem`;
  const [problem, setProblem] = useState<string | null>(null);
  const send = form.handleSubmit(async ({ answer }) => {
    setProblem(null);
    await post("/api/setup/say", {
      text: `${answer}\n\n(About: ${card.title} [${card.id}])\n\n(On the step: ${step.area ?? step.name})`,
    }).then(
      () => {
        form.reset();
      },
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  });
  return (
    <form className="grid gap-2" onSubmit={(event) => void send(event)}>
      <p>
        <b className="font-semibold">
          <Markdown
            text={/[.?!]$/.test(card.title) ? card.title : `${card.title}.`}
            inline
          />
        </b>{" "}
        <Markdown text={card.text ?? ""} inline />
      </p>
      <div className="flex gap-2">
        <input
          aria-label={t("setup.says.answerOn", {
            // Said without its Markdown marks.
            title: card.title.replaceAll(/[*`]/g, ""),
          })}
          className="h-9 min-w-0 flex-1 rounded-xl bg-ground px-3 text-[13.5px] outline-none aria-invalid:ring-1 aria-invalid:ring-destructive"
          placeholder={t("setup.says.yourAnswer")}
          {...markOf(answer, why)}
          {...form.register("answer")}
        />
        <Button type="submit" size="pill-sm" disabled={!form.formState.isValid}>
          <Send aria-hidden />
          {t("setup.says.answer")}
        </Button>
      </div>
      <FieldProblem id={why} field={answer} />
      {problem && (
        <p role="alert" className="text-[13px] text-destructive">
          {problem}
        </p>
      )}
    </form>
  );
}
