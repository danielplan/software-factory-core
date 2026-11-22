// The one line under the voice: what is happening now, or what went wrong,
// in plain words; while getting ready, which speech model is on its way and
// how far. Plain rules, so every message is checked.

import type { CallState, ModelProgress, Problem } from "./call-state.ts";
import { LANGUAGES } from "./languages.ts";
import { ENGLISH, type Messages } from "../../i18n/messages.ts";

type Words = Messages["voice"];

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

// The coach's own problem (it could not answer) comes after the call's.
export function statusLine(
  call: CallState,
  coachProblem: string | null,
  m: Words = ENGLISH.voice,
): Status {
  if (call.problem === "no-voice")
    return {
      text: m.noVoice(LANGUAGES[call.language].name),
      problem: true,
    };
  if (call.problem)
    return {
      text: m.problems[call.problem],
      problem: true,
      retry: CAN_RETRY.includes(call.problem),
    };
  if (coachProblem) return { text: coachProblem, problem: true };
  const getting = call.phase === "preparing" ? modelNow(call.progress) : null;
  if (getting) return gettingLine(getting, m);
  return { text: callLine(call, m), problem: false };
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
function gettingLine(now: ModelProgress, m: Words): Status {
  const percent = `${String(Math.round(now.fraction * 100))}%`;
  const text = now.kept
    ? m.loading(now.model, percent)
    : m.downloading(
        now.model,
        percent,
        megabytes(now.loaded),
        megabytes(now.total),
      );
  return { text, problem: false, progress: now.fraction };
}

function callLine(call: CallState, m: Words): string {
  switch (call.phase) {
    case "preparing":
      return m.preparing;
    case "listening":
      return call.writing ? m.writing : m.listening;
    case "thinking":
      return m.thinking;
    case "speaking":
      return m.speaking;
    case "off":
      return "";
  }
}
