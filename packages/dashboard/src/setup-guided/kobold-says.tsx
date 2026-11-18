// The kobold at the top of a step: what it said last (or what it is doing
// and writing now), and the box to answer it, typed or by talking. What the
// owner says carries the step it was said on and the cards they ask about.

import { useState } from "react";

import { type CoachView, messageOf, post } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Answer } from "@/setup-coach/answer-box";
import { attachedNames } from "@/setup-coach/canvas";
import { aboutLine } from "@/setup-coach/coach-chat";
import { Said } from "@/setup-coach/said";
import type { VoiceCall } from "@/voice/voice-call";

import { cardsIn, onStepLine, type Step } from "./steps";

// What the kobold says on a step: while the owner talks with it on this
// step, its reply; otherwise its open questions about this step, or a line
// about the step.
export function KoboldSays({
  coach,
  call,
  step,
  asked,
  talking,
  onSent,
}: Readonly<{
  coach: CoachView;
  call: VoiceCall;
  step: Step;
  asked: string[];
  // The owner said something on this step: the kobold's reply shows.
  talking: boolean;
  onSent: () => void;
}>) {
  const [problem, setProblem] = useState<string | null>(null);
  const said = talking
    ? coach.messages.findLast((m) => m.from === "coach")?.text
    : stepLine(coach, step);
  const say = (text: string) => {
    setProblem(null);
    onSent();
    post("/api/setup/say", {
      text:
        text + aboutLine(attachedNames(coach.draft, asked)) + onStepLine(step),
    }).catch((error: unknown) => {
      setProblem(messageOf(error));
    });
  };
  return (
    <div className="flex items-start gap-3">
      <KoboldHead size={40} />
      <div className="grid min-w-0 flex-1 gap-3">
        <div
          aria-live="polite"
          className="rounded-[4px_16px_16px_16px] bg-card px-4 py-3 text-[14.5px] leading-relaxed shadow-card"
        >
          <Bubble
            coach={talking ? coach : { ...coach, working: false }}
            said={said}
          />
        </div>
        <Answer
          call={call}
          coach={coach}
          onSay={say}
          placeholder="Answer the kobold, or ask about this step…"
        />
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </div>
    </div>
  );
}

// What the kobold says now: what it writes, what it does, or its last words.
function Bubble({
  coach,
  said,
}: Readonly<{ coach: CoachView; said: string | undefined }>) {
  if (!coach.working) return <Said text={said ?? "Hi, I’m your kobold."} />;
  if (coach.writing) return <Said text={coach.writing} />;
  return (
    <span className="text-muted-foreground">
      {coach.activity ?? "Thinking…"}
    </span>
  );
}

const LINES: Record<string, string> = {
  product:
    "Here is your product as I read it. Correct a card by telling me, or take it off.",
  people:
    "These are the people I think you build for. Add the real ones you know.",
  team: "This is who works on it and where the work is tracked.",
  how: "These parts of Kobble fit how you work. Take off what you don’t want.",
  bring: "This is what you have already, and what happens to it.",
  start: "Once Kobble is set up, these are worth exploring first.",
};

// The step's open questions (question cards not yet answered), or its line.
function stepLine(coach: CoachView, step: Step): string {
  const open = cardsIn(coach.draft, step.area).filter(
    (card) => card.tone === "question" && !card.confirmed,
  );
  if (open.length > 0)
    return open
      .map((card) => `**${card.title}.** ${card.text ?? ""}`)
      .join("\n\n");
  return LINES[step.id] ?? "";
}
