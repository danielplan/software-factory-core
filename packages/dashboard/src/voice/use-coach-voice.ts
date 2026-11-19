import { useEffect, useRef } from "react";

import { spoken } from "./answer-text";
import type { VoiceCall } from "./voice-call";

// Hands the coach's answers to the call: the reply while the coach writes
// it (each finished sentence is said at once), then the whole reply once
// it is complete; and a reply that failed.
// A conversation the call follows: the setup coach's or the kobold's.
export type Spoken = {
  writing: string | null;
  working: boolean;
  messages: { from: string; text: string }[];
  problem: string | null;
};

export function useCoachVoice(call: VoiceCall, coach: Spoken): void {
  const { writing, working, messages, problem } = coach;
  useEffect(() => {
    if (writing) call.speech(spoken(writing), false);
  }, [writing, call]);

  // A new reply: the conversation grew with the coach's words.
  const heard = useRef(messages.length);
  useEffect(() => {
    if (working || messages.length === heard.current) return;
    heard.current = messages.length;
    const last = messages.at(-1);
    if (last?.from === "coach" || last?.from === "kobold")
      call.speech(spoken(last.text), true);
  }, [working, messages, call]);

  useEffect(() => {
    if (problem) call.failed();
  }, [problem, call]);
}
