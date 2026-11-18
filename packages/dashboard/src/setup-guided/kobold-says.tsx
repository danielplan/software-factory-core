// The kobold at the top of a step, as in the design: one sentence about the
// step, or its open questions about it, each with a small field to answer
// it. There is no chat: the owner corrects cards in place.

import { useState } from "react";

import { type Card, type CoachView, messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Button } from "@/components/ui/button";

import { cardsIn, type Step } from "./steps";

const LINES: Record<string, string> = {
  product:
    "Here is your product as I read it. Click a card to correct it, or take it off.",
  people:
    "These are the people I think you build for. Add the real ones you know.",
  team: "I found who works on it in the history, and where the work is tracked.",
  how: "These fit how you’ve worked so far. Change anything you like.",
  bring: "This is what you have already, and what happens to it.",
  setup: "When you press Set up Kobble, I write it all into your repository.",
  start: "From what I read, these are worth starting with.",
};

export function KoboldSays({
  coach,
  step,
}: Readonly<{ coach: CoachView; step: Step }>) {
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
              ? "One moment, I’m changing the cards…"
              : (LINES[step.id] ?? "")}
          </p>
        ) : (
          open.map((card) => (
            <Question
              key={card.id}
              card={card}
              step={step}
              busy={coach.working}
            />
          ))
        )}
      </div>
    </div>
  );
}

// One of the kobold's questions, answered in place.
function Question({
  card,
  step,
  busy,
}: Readonly<{ card: Card; step: Step; busy: boolean }>) {
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
        {card.text}
      </p>
      <div className="flex gap-2">
        <input
          aria-label={`Answer: ${card.title}`}
          className="h-9 min-w-0 flex-1 rounded-xl bg-ground px-3 text-[13.5px] outline-none"
          placeholder="Your answer"
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
          }}
        />
        <Button type="submit" size="pill-sm" disabled={busy || !answer.trim()}>
          {busy ? "…" : "Answer"}
        </Button>
      </div>
      {problem && <p className="text-sm text-destructive">{problem}</p>}
    </form>
  );
}
