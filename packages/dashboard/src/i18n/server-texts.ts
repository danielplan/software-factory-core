// The server's own words the dashboard shows often, in the language shown:
// the launcher's problem titles. The server writes them in English with
// what they name; each is matched and said again with the same names.
// Anything else stays as the server wrote it.

import type { TFunction } from "i18next";

const PATTERNS: [RegExp, (t: TFunction, found: string[]) => string][] = [
  [
    /^Address (\d+) is used by a program from another folder$/,
    (t, [port = ""]) => t("system.problems.portElsewhere", { port }),
  ],
  [
    /^Address (\d+) is used by another program$/,
    (t, [port = ""]) => t("system.problems.portUsed", { port }),
  ],
  [
    /^The settings file (.+) is missing$/,
    (t, [file = ""]) => t("system.problems.settingsMissing", { file }),
  ],
  [
    /^"(.+)" didn't work for (.+)$/,
    (t, [step = "", part = ""]) =>
      t("system.problems.stepFailed", { step, part }),
  ],
  [
    /^(.+) did not answer within (\d+) seconds?$/,
    (t, [part = "", seconds = ""]) =>
      t("system.problems.noAnswer", { part, seconds }),
  ],
  [
    /^(.+) is waiting for (.+)$/,
    (t, [part = "", missing = ""]) =>
      t("system.problems.waiting", { part, missing }),
  ],
];

// The steps of an update and why a folder cannot take one, as the server
// says them (updates/served.ts, project-updates.ts).
const STEPS: Record<string, "install" | "factory" | "products"> = {
  "Installing what the changes need": "install",
  "Starting the factory again on the new Kobble": "factory",
  "Starting the products again": "products",
};

export function updateStep(step: string, t: TFunction): string {
  const key = STEPS[step];
  return key ? t(`updates.steps.${key}`) : step;
}

const REASONS: [RegExp, (t: TFunction, found: string[]) => string][] = [
  [
    /^this folder is on the branch "(.*)", not on (.+)$/,
    (t, [branch = "", main = ""]) =>
      t("updates.reasons.branch", { branch, main }),
  ],
  [
    /^(\d+) file\(s\) in this folder were changed by hand/,
    (t, [count = ""]) => t("updates.reasons.changed", { count: Number(count) }),
  ],
  [
    /^this folder has (\d+) saved change/,
    (t, [count = ""]) => t("updates.reasons.own", { count: Number(count) }),
  ],
  [/^files here that git does not keep/, (t) => t("updates.reasons.overwrite")],
  [/^git could not move this folder forward$/, (t) => t("updates.reasons.git")],
];

export function updateReason(reason: string, t: TFunction): string {
  for (const [pattern, say] of REASONS) {
    const found = pattern.exec(reason);
    if (found) return say(t, found.slice(1));
  }
  return reason;
}

export function problemTitle(title: string, t: TFunction): string {
  for (const [pattern, say] of PATTERNS) {
    const found = pattern.exec(title);
    if (found) return say(t, found.slice(1));
  }
  return title;
}

// Why the explorer could not answer, as the server says it (coach/talk.ts):
// the reason alone, and what to do about it. Anything else the server
// wrote stays as it was, without its last full stop.
export function stopWords(
  problem: string,
  t: TFunction,
): { reason: string; how: string } {
  if (/^Claude Code is not on this computer\./.test(problem))
    return {
      reason: t("explore.stopped.missing"),
      how: t("explore.stopped.missingHow"),
    };
  if (/^Claude Code is not signed in\./.test(problem))
    return {
      reason: t("explore.stopped.signedOut"),
      how: t("explore.stopped.signedOutHow"),
    };
  const found = /^.+ stopped: ([\s\S]*)\. Try again\.$/.exec(problem);
  if (found) {
    const said = found[1] ?? "";
    return {
      reason:
        said === "no reason given"
          ? t("explore.stopped.noReason")
          : t("explore.stopped.other", { reason: said }),
      how: t("explore.reading.tryAgain"),
    };
  }
  return { reason: problem.replace(/\.$/, ""), how: "" };
}
