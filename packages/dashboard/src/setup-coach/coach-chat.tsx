import { use, useState } from "react";

import { type CoachView, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";

import type { VoiceCall } from "@/voice/voice-call";

import { Answer } from "./answer-box";
import { CoachRouteContext } from "./route";
import { useT } from "@/i18n/use-t";

type Attached = { id: string; name: string };

// Sending the owner's words to the coach, with the pieces of the canvas
// they are about; why it failed, if it did.
function useSay(attached: Attached[], onSent: () => void) {
  const route = use(CoachRouteContext);
  const [problem, setProblem] = useState<string | null>(null);
  const say = (text: string) => {
    setProblem(null);
    onSent();
    post(route.say, { ...route.with, text: text + aboutLine(attached) }).catch(
      (error: unknown) => {
        setProblem(messageOf(error));
      },
    );
  };
  return { say, problem };
}

// Before the first answer: nothing but a box to answer the coach's first
// question in (or Talk), in the middle of the page. Once the owner answers,
// the guided setup's steps take over (setup-guided/).
export function CoachStart({
  coach,
  call,
}: Readonly<{ coach: CoachView; call: VoiceCall }>) {
  const t = useT();
  const { say, problem } = useSay([], () => undefined);
  return (
    <section
      aria-label={t.setup.coach.label}
      className="grid w-full max-w-[640px] animate-pop gap-3"
    >
      <Answer
        call={call}
        coach={coach}
        onSay={say}
        placeholder={t.setup.coach.build}
        className="glow-ring p-3 pl-5 text-base shadow-big"
      />
      {problem && <ProblemBox title={t.setup.coach.couldNot} text={problem} />}
    </section>
  );
}

// The end of the owner's message naming the pieces it is about, with their
// ids for the coach.
export function aboutLine(attached: Attached[]): string {
  if (attached.length === 0) return "";
  const named = attached.map((a) => a.name + " [" + a.id + "]");
  return `\n\n(About: ${named.join(", ")})`;
}
