// The one line under the voice: what is happening now, or what went wrong,
// in plain words; while getting ready, which speech model is on its way and
// how far. Plain rules, so every message is checked.

import type { CallState, ModelProgress, Problem } from "./call-state.ts";
import { LANGUAGES } from "./languages.ts";

export type Status = {
  text: string;
  problem: boolean;
  // How far a speech model is (0 to 1): a thin bar under the line.
  progress?: number;
  // Offers a Try again button.
  retry?: boolean;
};

// Problems that a second try may fix.
const CAN_RETRY: Problem[] = ["download", "stalled"];

const PROBLEMS: Record<Exclude<Problem, "no-voice">, string> = {
  unsupported:
    "This browser has no graphics card support (WebGPU), so the speech model can't run here. Open the factory in an up-to-date Chrome or Edge.",
  stalled:
    "Getting ready has been stuck for 30 seconds with nothing happening. Check the internet connection, then try again.",
  blocked:
    "The browser is not allowed to use the microphone. Click the icon at the left of the address bar, allow the microphone, then press Talk again.",
  "no-microphone":
    "No microphone found. Plug one in or connect your headset, then press Talk again.",
  "microphone-busy":
    "The microphone is in use by another program. Close it (a call, a recorder), then press Talk again.",
  "microphone-failed":
    "The microphone opened, but its sound couldn't be read. Reload the page and press Talk again.",
  download:
    "The speech model couldn't be downloaded. Check the internet connection, then try again.",
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
  if (call.problem)
    return {
      text: PROBLEMS[call.problem],
      problem: true,
      retry: CAN_RETRY.includes(call.problem),
    };
  if (coachProblem) return { text: coachProblem, problem: true };
  const getting = call.phase === "preparing" ? modelNow(call.progress) : null;
  if (getting) return gettingLine(getting);
  return { text: callLine(call), problem: false };
}

const megabytes = (bytes: number) => String(Math.round(bytes / 1_000_000));

// The speech model being got while getting ready: the accurate one first,
// then the quick one; none once both are there.
function modelNow(progress: CallState["progress"]): ModelProgress | null {
  const models = [progress.accurate, progress.quick];
  return models.find((model) => model && model.fraction < 1) ?? null;
}

// Which model is downloading or loading, how far, and a thin bar under the
// line. A download also says its size so far.
function gettingLine(now: ModelProgress): Status {
  const percent = `${String(Math.round(now.fraction * 100))}%`;
  const text = now.kept
    ? `Getting ready, don't talk yet: loading the ${now.model} speech model… ${percent}`
    : `Downloading the ${now.model} speech model, only the first time: ${percent} (${megabytes(now.loaded)} of ${megabytes(now.total)} MB)`;
  return { text, problem: false, progress: now.fraction };
}

function callLine(call: CallState): string {
  switch (call.phase) {
    case "preparing":
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
