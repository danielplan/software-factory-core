// The one line under the voice: what is happening now, or what went wrong,
// in plain words. Plain rules, so every message is checked.

import type { CallState, Problem } from "./call.ts";
import { LANGUAGES } from "./languages.ts";

export type Status = { text: string; problem: boolean };

const PROBLEMS: Record<Exclude<Problem, "no-voice">, string> = {
  unsupported:
    "This browser can't run the speech model. Open the factory in an up-to-date Chrome or Edge.",
  blocked:
    "The browser is not allowed to use the microphone. Click the icon at the left of the address bar, allow the microphone, then press Talk again.",
  "no-microphone":
    "No microphone found. Plug one in or connect your headset, then press Talk again.",
  "microphone-busy":
    "The microphone is in use by another program. Close it (a call, a recorder), then press Talk again.",
  "microphone-failed":
    "The microphone opened, but its sound couldn't be read. Reload the page and press Talk again.",
  download:
    "The speech model couldn't be downloaded. Check the internet connection, then press Talk again.",
  "voice-failed":
    "The coach's voice couldn't be played, so you won't hear its answers. Check that your speakers or headphones are on, then press Talk again.",
  "not-sent": "Your words couldn't be sent. Please say them again.",
};

// The coach's own problem (it could not answer) comes after the call's.
export function statusLine(
  call: CallState,
  coachProblem: string | null,
): Status {
  if (call.problem === "no-voice")
    return {
      text: `There's no ${LANGUAGES[call.language].name} voice in this browser, so the answers can't be read out. Add one in the computer's speech settings, or choose another language.`,
      problem: true,
    };
  if (call.problem) return { text: PROBLEMS[call.problem], problem: true };
  if (coachProblem) return { text: coachProblem, problem: true };
  return { text: callLine(call), problem: false };
}

function callLine(call: CallState): string {
  switch (call.phase) {
    case "preparing":
      if (call.progress !== null)
        return `Getting the speech model, only the first time (about 0.8 GB): ${String(Math.round(call.progress * 100))}%`;
      return "Getting ready, don't talk yet: loading the speech model…";
    case "listening":
      return call.writing
        ? "Writing down what you said…"
        : "Listening. Go ahead.";
    case "thinking":
      return "Got it. Working on it…";
    case "speaking":
      return "Speaking… say “stop” to interrupt.";
    case "off":
      return "";
  }
}
