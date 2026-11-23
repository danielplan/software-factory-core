// What making a version gave: committed and pushed (so a teammate opens it
// too; the board says when it could not be), shown on the board as ready or
// stopped, and told to the kobold who talks with the team.

import type { Claude, Workspace } from "@software-factory/core";

import type { PrototypeMode } from "../../prototypes/mode.ts";
import { commitWords, notShared, stopped } from "./making-words.ts";
import type { Looks } from "./looks.ts";
import type { Made } from "./versions.ts";

// A prototype the maker finished: its name, its thing on the board, what
// the maker said it did, the files it changed, and how it looks running.
export type MadeReport = {
  name: string;
  thing: string;
  said: string;
  files: string;
  looks: Looks;
};

export type Ready =
  ((exploration: string, key: string, made: MadeReport) => void) | null;

// Who is told when a prototype could not be made, and why, so nobody keeps
// saying it is on its way.
export type Failed =
  ((exploration: string, key: string, why: string) => void) | null;

export async function finishMaking(on: {
  mode: PrototypeMode;
  workspace: Workspace;
  exploration: string;
  made: Made;
  change: string | undefined;
  result: Awaited<ReturnType<Claude["run"]>>;
  ready: Ready;
  failed: Failed;
  // Started and photographed, once it is made.
  look: () => Promise<Looks>;
}): Promise<void> {
  const { mode, workspace, exploration, made, change, result } = on;
  await workspace.commitAll(
    commitWords(exploration, made, change, result.ok ? result.text : ""),
  );
  const unshared = notShared(await workspace.pushBranch(made.branch));
  const problem = result.ok
    ? unshared
    : stopped(result.error, made.branch, unshared);
  mode.set(exploration, made.key, { making: false, activity: null, problem });
  if (!result.ok) on.failed?.(exploration, made.key, problem ?? "");
  if (result.ok)
    on.ready?.(exploration, made.key, {
      name: change ? `changed: ${change}` : made.name,
      thing: made.id,
      said: result.text.trim().slice(0, 3000),
      files: (await workspace.changes()).slice(0, 2000),
      looks: await on.look(),
    });
}

// What the kobold who talks with the team hears of a prototype made: the
// maker's words, the files it changed, and the pictures of it running,
// which it reads before it says it is ready.
export function reviewWords(key: string, made: MadeReport): string {
  const { pictures, problem } = made.looks;
  const looked =
    pictures.length > 0
      ? `Pictures of it running, on the page it opens on (one per variant): ${pictures.join(", ")}. Read each one first. When a picture does not show what was asked, say so in one line and have it fixed (change_prototype); do not ask the team to try it.`
      : `It could not be looked at running: ${problem ?? "no picture"}. Say so in one line; do not call it ready to try.`;
  const report = [
    `Prototype ${key} (${made.name}) is made.`,
    made.said ? `The maker who built it says:\n${made.said}` : "",
    made.files ? `The files it changed:\n${made.files}` : "",
    looked,
  ]
    .filter(Boolean)
    .join("\n\n");
  return `(Not from the team: ${report}\n\nReview it for the team: is it what the plan and the problem asked for, what is missing or off, and one thing to try or change. Then ask them to try it on the board.)`;
}

// What the kobold who talks with the team hears of a prototype that could
// not be made: why, and that it must not say it is still on its way.
export function failedWords(key: string, why: string): string {
  return `(Not from the team: Prototype ${key} could not be made, so there is no preview of it. Why, in the factory's words: ${why.slice(0, 600)}\n\nTell the team in one or two plain lines, without the technical words: there is no preview of ${key}, and what that means for them. Never say the maker is still making it. Then offer what they can do next: have it made again (make_prototype) when the reason may pass, or carry on and hand off from the agreed picture.)`;
}

// The same, noted for the next turn while the kobold is answering.
export function failedNote(key: string, why: string): string {
  return `prototype ${key} could not be made, so there is no preview of it (${why.slice(0, 300)}); never say it is still being made`;
}
