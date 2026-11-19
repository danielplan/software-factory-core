// The call's state, events and effects, and the state between calls (the
// rules that join them are in call.ts). No browser or screen parts.

import type { Language } from "./languages.ts";
import type { MicrophoneProblem } from "./microphone.ts";
import type { VoiceProblem } from "./speaker.ts";

export type Phase = "off" | "preparing" | "listening" | "thinking" | "speaking";

// What can go wrong, each with its own plain message (status-line.ts).
export type Problem =
  | MicrophoneProblem
  | VoiceProblem
  | "unsupported"
  | "download"
  | "stalled"
  | "not-sent";

// The two speech models: the quick one writes the grey words while the owner
// speaks, the accurate one the sentence that is sent.
export type ModelName = "quick" | "accurate";

// How far getting one speech model is, while getting ready: a download
// (sizes in bytes), or reading the copy the browser kept.
export type ModelProgress = {
  model: ModelName;
  fraction: number;
  loaded: number;
  total: number;
  kept: boolean;
};

export type CallState = {
  phase: Phase;
  // How far each speech model is, while getting ready.
  progress: Partial<Record<ModelName, ModelProgress>>;
  // The voice test runs when Talk is pressed (a short sentence out loud);
  // the ears start only once it is over and the speech model is ready, so
  // they do not hear it.
  testing: boolean;
  modelReady: boolean;
  // The language the owner chose to speak (the switch beside Talk): the
  // ears write their words down in it and the coach answers in it.
  language: Language;
  // The owner's sentence is being turned into text, before it is sent.
  writing: boolean;
  // A sound heard after the turn was sent (a breath, a noise, a few more
  // words) is being turned into text, quietly: the glow keeps saying
  // Thinking.
  quietly: boolean;
  // The coach's answer to the last turn, as far as it was handed to the
  // voice; whether the answer is complete; whether the voice still talks;
  // whether the owner stopped it (the rest of that answer is not read).
  speech: string;
  complete: boolean;
  talking: boolean;
  stopped: boolean;
  problem: Problem | null;
};

export type CallEvent =
  | { type: "start" }
  // The owner chose the language they speak.
  | { type: "language"; language: Language }
  | { type: "progress"; progress: ModelProgress }
  | { type: "prepared" }
  // The voice test is over: null when the voice works.
  | { type: "tested"; problem: VoiceProblem | null }
  | { type: "end" }
  | { type: "sentence" }
  | { type: "heard"; text: string; language: Language }
  // The coach's spoken answer so far; final once the reply is complete.
  | { type: "speech"; text: string; final: boolean }
  // The voice said everything it was given.
  | { type: "drained" }
  | { type: "failed" }
  | { type: "problem"; problem: Problem };

export type Effect =
  | { type: "prepare" }
  | { type: "test-voice"; language: Language }
  | { type: "listen" }
  | { type: "stop-listening" }
  | { type: "quick"; on: boolean }
  | { type: "hold"; ms: number }
  | { type: "cue" }
  | { type: "send"; text: string; language: Language }
  | { type: "say"; text: string; language: Language }
  | { type: "stop-voice" };

export const NO_ANSWER = {
  speech: "",
  complete: false,
  talking: false,
  stopped: false,
};

export function idleCall(language: Language = "en"): CallState {
  return {
    phase: "off",
    progress: {},
    testing: false,
    modelReady: false,
    language,
    writing: false,
    quietly: false,
    ...NO_ANSWER,
    problem: null,
  };
}

// Whether the voice takes the place of the box to type: during a call, and
// after a problem ended it, until the owner tries again or closes it.
export function showsVoice(state: CallState): boolean {
  return state.phase !== "off" || state.problem !== null;
}
