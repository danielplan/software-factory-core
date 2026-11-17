// The one line under the voice: what is happening now, or what went wrong,
// in plain words. Plain rules, so every message is checked.

import { t } from "../i18n/i18n.ts";
import type { CallState, Problem } from "./call.ts";
import { LANGUAGES } from "./languages.ts";

export type Status = { text: string; problem: boolean };

// Each problem's words (their keys in the setup words).
const PROBLEMS = {
  unsupported: "voice.problem.unsupported",
  blocked: "voice.problem.blocked",
  "no-microphone": "voice.problem.noMicrophone",
  "microphone-busy": "voice.problem.microphoneBusy",
  "microphone-failed": "voice.problem.microphoneFailed",
  download: "voice.problem.download",
  "voice-failed": "voice.problem.voiceFailed",
  "not-sent": "voice.problem.notSent",
} as const satisfies Record<Exclude<Problem, "no-voice">, string>;

// The coach's own problem (it could not answer) comes after the call's.
export function statusLine(
  call: CallState,
  coachProblem: string | null,
): Status {
  if (call.problem === "no-voice")
    return {
      text: t("setup:voice.noVoice", {
        language: LANGUAGES[call.language].name,
      }),
      problem: true,
    };
  if (call.problem)
    return { text: t(PROBLEMS[call.problem], { ns: "setup" }), problem: true };
  if (coachProblem) return { text: coachProblem, problem: true };
  return { text: callLine(call), problem: false };
}

function callLine(call: CallState): string {
  switch (call.phase) {
    case "preparing":
      if (call.progress !== null)
        return t("setup:voice.status.download", {
          percent: Math.round(call.progress * 100),
        });
      return t("setup:voice.status.preparing");
    case "listening":
      return call.writing
        ? t("setup:voice.status.writing")
        : t("setup:voice.status.listening");
    case "thinking":
      return t("setup:voice.status.thinking");
    case "speaking":
      return t("setup:voice.status.speaking");
    case "off":
      return "";
  }
}
