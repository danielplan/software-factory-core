// The call with the coach, as plain rules: whose turn it is
// (Getting ready → Listening → Thinking → Speaking), what each event
// changes, and what the browser parts must do next (listen, send, say a
// sentence, stop the voice…). No browser or screen parts here, so the rules
// are tested on their own; the voice call (voice-call.ts) carries out the
// effects.

import type { Language } from "./languages.ts";
import type { MicrophoneProblem } from "./microphone.ts";
import type { VoiceProblem } from "./speaker.ts";
import { sayable } from "./answer-text.ts";
import { asksToStop } from "./stop-words.ts";

// How long the owner may stay silent before their turn is sent.
export const SEND_AFTER_PAUSE_MS = 1500;
// While the coach speaks, sentences end after a shorter pause, so "stop" is
// heard quickly.
export const QUICK_PAUSE_MS = 500;
// A sent turn: the ears rest this long and a short sound says it was taken.
export const HOLD_AFTER_SEND_MS = 1000;

export type Phase = "off" | "preparing" | "listening" | "thinking" | "speaking";

// What can go wrong, each with its own plain message (status-line.ts).
export type Problem =
  MicrophoneProblem | VoiceProblem | "unsupported" | "download" | "not-sent";

export type CallState = {
  phase: Phase;
  // How much of the speech model is downloaded (0 to 1), while getting ready.
  progress: number | null;
  // The voice test runs when Talk is pressed (a short sentence out loud);
  // the ears start only once it is over and the speech model is ready, so
  // they do not hear it.
  testing: boolean;
  modelReady: boolean;
  // The language the owner chose to speak (the switch beside Talk): the
  // ears write their words down in it and the coach answers in it.
  language: Language;
  // A sentence is being turned into text.
  writing: boolean;
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
  | { type: "progress"; fraction: number | null }
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

type Step = { state: CallState; effects: Effect[] };

// Problems after which the call cannot go on.
const ENDS_CALL: Problem[] = [
  "unsupported",
  "blocked",
  "no-microphone",
  "microphone-busy",
  "microphone-failed",
  "download",
];

const NO_ANSWER = {
  speech: "",
  complete: false,
  talking: false,
  stopped: false,
};

export function idleCall(language: Language = "en"): CallState {
  return {
    phase: "off",
    progress: null,
    testing: false,
    modelReady: false,
    language,
    writing: false,
    ...NO_ANSWER,
    problem: null,
  };
}

// What one event changes, and what the browser parts must do next.
export function step(state: CallState, event: CallEvent): Step {
  return (RULES[event.type] as Rule<CallEvent>)(state, event);
}

type Rule<E extends CallEvent> = (state: CallState, event: E) => Step;

const unchanged = (state: CallState): Step => ({ state, effects: [] });
const isOn = (state: CallState) => state.phase !== "off";
const RULES: {
  [T in CallEvent["type"]]: Rule<Extract<CallEvent, { type: T }>>;
} = {
  start: (state) => {
    if (isOn(state)) return unchanged(state);
    return {
      state: {
        ...idleCall(state.language),
        phase: "preparing",
        testing: true,
      },
      effects: [
        { type: "prepare" },
        { type: "test-voice", language: state.language },
      ],
    };
  },
  language: (state, event) => ({
    state: { ...state, language: event.language },
    effects: [],
  }),
  progress: (state, event) =>
    state.phase === "preparing"
      ? { state: { ...state, progress: event.fraction }, effects: [] }
      : unchanged(state),
  prepared: (state) => {
    if (state.phase !== "preparing") return unchanged(state);
    return listenWhenReady({ ...state, progress: null, modelReady: true });
  },
  tested: (state, event) => {
    if (state.phase !== "preparing") return unchanged(state);
    return listenWhenReady({
      ...state,
      testing: false,
      problem: event.problem,
    });
  },
  end: (state) => {
    if (!isOn(state)) return unchanged(state);
    return {
      state: idleCall(state.language),
      effects: [{ type: "stop-voice" }, { type: "stop-listening" }],
    };
  },
  sentence: (state) =>
    state.phase === "listening" || state.phase === "thinking"
      ? { state: { ...state, writing: true }, effects: [] }
      : unchanged(state),
  heard: (state, event) =>
    heard({ ...state, writing: false }, event.text.trim(), event.language),
  speech: (state, event) => speech(state, event.text, event.final),
  drained: (state) => drained(state),
  failed: (state) =>
    state.phase === "thinking"
      ? { state: { ...state, phase: "listening", ...NO_ANSWER }, effects: [] }
      : unchanged(state),
  problem: (state, event) => problem(state, event.problem),
};

// The voice said everything it was given.
function drained(state: CallState): Step {
  const done = { ...state, talking: false };
  if (state.phase !== "speaking") return { state: done, effects: [] };
  // More of the answer is still being written: wait for it.
  if (!state.complete)
    return { state: { ...done, phase: "thinking" }, effects: [] };
  return {
    state: { ...done, phase: "listening" },
    effects: [{ type: "quick", on: false }],
  };
}

function problem(state: CallState, problem: Problem): Step {
  if (ENDS_CALL.includes(problem))
    return {
      state: { ...idleCall(state.language), problem },
      effects: isOn(state)
        ? [{ type: "stop-voice" }, { type: "stop-listening" }]
        : [],
    };
  if (!isOn(state)) return unchanged(state);
  return {
    state: { ...state, phase: "listening", ...NO_ANSWER, problem },
    effects: [{ type: "stop-voice" }, { type: "quick", on: false }],
  };
}

// A sentence was turned into text (empty when it was only noise).
function heard(state: CallState, text: string, language: Language): Step {
  if (!text) return { state, effects: [] };
  switch (state.phase) {
    case "listening":
      return send(state, text, language);
    case "thinking":
      if (asksToStop(text, state.speech)) return stop(state);
      // Said while the coach thinks: it answers both.
      return {
        state: { ...state, language },
        effects: [{ type: "send", text, language }],
      };
    case "speaking":
      // Only a request to stop counts while the coach speaks: its own voice
      // from the speakers, other people and anything else are let go.
      return asksToStop(text, state.speech)
        ? stop(state)
        : { state, effects: [] };
    default:
      return { state, effects: [] };
  }
}

// The coach's spoken answer: each finished sentence goes to the voice as
// soon as it is written; the rest once the answer is complete.
function speech(state: CallState, text: string, final: boolean): Step {
  if (!readsAnswer(state)) return { state, effects: [] };
  const ready = sayable(text, final, state.speech, state.language);
  const more = ready.startsWith(state.speech)
    ? ready.slice(state.speech.length).trim()
    : "";
  const effects = sayEffects(state, more);
  const talking = state.talking || Boolean(more);
  const next: CallState = {
    ...state,
    speech: more ? ready : state.speech,
    complete: final,
    talking,
    phase: talking ? "speaking" : state.phase,
  };
  // Complete and nothing left to say: the owner's turn again.
  if (final && !talking) {
    return {
      state: { ...next, phase: "listening" },
      effects: [...effects, { type: "quick", on: false }],
    };
  }
  return { state: next, effects };
}

// Whether the coach's answer is still being read out.
function readsAnswer(state: CallState): boolean {
  const reading = state.phase === "thinking" || state.phase === "speaking";
  return reading && !state.complete && !state.stopped;
}

// Hands the new part of the answer to the voice; once the coach starts
// speaking, sentences end after a shorter pause so "stop" is heard quickly.
function sayEffects(state: CallState, more: string): Effect[] {
  if (!more) return [];
  const say: Effect = { type: "say", text: more, language: state.language };
  if (state.phase === "speaking") return [say];
  return [{ type: "quick", on: true }, say];
}

// Listening starts once the speech model is ready and the voice test is over.
function listenWhenReady(state: CallState): Step {
  if (state.testing || !state.modelReady) return { state, effects: [] };
  return {
    state: { ...state, phase: "listening" },
    effects: [{ type: "listen" }],
  };
}

function stop(state: CallState): Step {
  return {
    state: {
      ...state,
      phase: "listening",
      talking: false,
      stopped: true,
    },
    effects: [{ type: "stop-voice" }, { type: "quick", on: false }],
  };
}

function send(state: CallState, text: string, language: Language): Step {
  return {
    state: {
      ...state,
      phase: "thinking",
      language,
      ...NO_ANSWER,
      problem: null,
    },
    effects: [
      { type: "send", text, language },
      { type: "hold", ms: HOLD_AFTER_SEND_MS },
      { type: "cue" },
    ],
  };
}
