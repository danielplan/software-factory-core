// The server's own words the dashboard shows often, in the language shown:
// the launcher's problem titles. The server writes them in English with
// what they name; each is matched and said again with the same names.
// Anything else stays as the server wrote it.

import type { Messages } from "./messages.ts";

type Problems = Messages["system"]["problems"];
type Updates = Messages["updates"];

const PATTERNS: [RegExp, (p: Problems, found: string[]) => string][] = [
  [
    /^Address (\d+) is used by a program from another folder$/,
    (p, [port = ""]) => p.portElsewhere(port),
  ],
  [
    /^Address (\d+) is used by another program$/,
    (p, [port = ""]) => p.portUsed(port),
  ],
  [
    /^The settings file (.+) is missing$/,
    (p, [file = ""]) => p.settingsMissing(file),
  ],
  [
    /^"(.+)" didn't work for (.+)$/,
    (p, [step = "", part = ""]) => p.stepFailed(step, part),
  ],
  [
    /^(.+) did not answer within (\d+) seconds?$/,
    (p, [part = "", seconds = ""]) => p.noAnswer(part, seconds),
  ],
  [
    /^(.+) is waiting for (.+)$/,
    (p, [part = "", missing = ""]) => p.waiting(part, missing),
  ],
];

// The steps of an update and why a folder cannot take one, as the server
// says them (updates/served.ts, project-updates.ts).
export function updateStep(step: string, m: Updates): string {
  const english: Record<string, keyof Updates["steps"]> = {
    "Installing what the changes need": "install",
    "Starting the factory again on the new Kobble": "factory",
    "Starting the products again": "products",
  };
  const key = english[step];
  return key ? m.steps[key] : step;
}

const REASONS: [RegExp, (r: Updates["reasons"], found: string[]) => string][] =
  [
    [
      /^this folder is on the branch "(.*)", not on (.+)$/,
      (r, [branch = "", main = ""]) => r.branch(branch, main),
    ],
    [
      /^(\d+) file\(s\) in this folder were changed by hand/,
      (r, [count = ""]) => r.changed(count),
    ],
    [/^this folder has (\d+) saved change/, (r, [count = ""]) => r.own(count)],
    [/^files here that git does not keep/, (r) => r.overwrite],
    [/^git could not move this folder forward$/, (r) => r.git],
  ];

export function updateReason(reason: string, m: Updates): string {
  for (const [pattern, say] of REASONS) {
    const found = pattern.exec(reason);
    if (found) return say(m.reasons, found.slice(1));
  }
  return reason;
}

export function problemTitle(title: string, problems: Problems): string {
  for (const [pattern, say] of PATTERNS) {
    const found = pattern.exec(title);
    if (found) return say(problems, found.slice(1));
  }
  return title;
}
