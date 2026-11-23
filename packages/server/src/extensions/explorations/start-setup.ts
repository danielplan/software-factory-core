// Working out how to start the app, once, for the whole team: the project
// has no start command, so Tinker reads the project and proposes one (its
// guide, prototype-start.md), the factory tries it in the prototype's copy
// (it must say where it runs, and that address must answer), and only a
// start that came up is kept, in the company file, where the start command
// already lives. A start that fails goes back to Tinker with what it
// printed, a few times; when it still fails, the reason is Tinker's own, in
// plain words. Logins and outside services are never the reason: the guide
// has Tinker make them up.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type ClaudeResult,
  readCompany,
  saveCompany,
} from "@software-factory/core";
import { guidesFolder } from "@software-factory/skills";

import type { PrototypeMode } from "../../prototypes/mode.ts";

// How many starts Tinker proposes before it says it could not.
export const ATTEMPTS = 3;

// No reason of Tinker's own: the page says in its own words that none of the
// ways Tinker tried came up.
export const NO_REASON = "";

export type SetUp = { start: string } | { problem: string };

export type StartAsker = (
  prompt: string,
  resume: boolean,
) => Promise<ClaudeResult>;

type On = {
  // The factory's folder (its company file keeps the start command).
  root: string;
  project: string;
  mode: PrototypeMode;
  exploration: string;
  key: string;
  // Tinker, in the prototype's copy, with the guide as its instructions.
  ask: StartAsker;
  // What was tried that stopped working, when this is a second go.
  failed?: { command: string; why: string };
};

// The `Start:` line of Tinker's answer (the last one), or its
// `Could not start:` reason.
export function startIn(text: string): {
  command?: string;
  reason?: string;
} {
  let command: string | undefined;
  let reason: string | undefined;
  for (const line of text.split("\n")) {
    const plain = line.trim().replace(/^`/, "").replace(/`$/, "").trim();
    if (plain.startsWith("Start:")) command = plain.slice(6).trim() || command;
    if (plain.startsWith("Could not start:"))
      reason = plain.slice(16).trim() || reason;
  }
  return { command, reason };
}

export function startGuide(): string {
  return readFileSync(join(guidesFolder, "prototype-start.md"), "utf8");
}

function firstWords(on: On): string {
  const { failed } = on;
  return [
    "This project has no start command yet. Work out how to start its app, as your instructions say, and answer with the Start line.",
    failed
      ? `The start kept for the project used to work and has stopped working:\n${failed.command}\nWhat it said: ${failed.why}\nWork out what it should be now.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function againWords(tried: string, why: string): string {
  return `That start did not come up.\nWhat you proposed: ${tried}\nWhat happened: ${why.slice(0, 1500)}\nChange it, then answer again with the Start line. When you cannot, answer with the Could not start line.`;
}

// Tinker proposes, the factory tries; the start that came up, kept for the
// whole team, or Tinker's reason.
export async function setUpStart(on: On): Promise<SetUp> {
  const { mode, exploration, key } = on;
  let prompt = firstWords(on);
  let reason: string | undefined;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    const answer = await on.ask(prompt, attempt > 1);
    if (!answer.ok) return { problem: NO_REASON };
    const said = startIn(answer.text);
    reason = said.reason ?? reason;
    if (!said.command) {
      if (said.reason) return { problem: said.reason };
      prompt =
        "Answer with the Start line (`Start: <the command>`), or with the Could not start line.";
      continue;
    }
    const tried = await mode.trial(exploration, key, said.command);
    if (tried.ok) return kept(on.root, said.command);
    prompt = againWords(said.command, tried.why);
  }
  return { problem: reason ?? NO_REASON };
}

// Kept in the company file next to the start command a team writes; what
// is there besides it (stop, remove) stays.
function kept(root: string, command: string): SetUp {
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) return { problem: NO_REASON };
  const { company } = read;
  saveCompany(root, {
    ...company,
    prototype: { ...company.prototype, start: command, by: "tinker" },
  });
  return { start: command };
}
