// The branch a card is built on, and what the builder did put on it.

import { run, stageAllButSettings } from "@software-factory/core";

import { branchOf } from "../../../cards/cards.ts";

// The commit the copy is on: a session that moved it did some work.
export async function headOf(folder: string): Promise<string> {
  return (await run("git", ["-C", folder, "rev-parse", "HEAD"])).trim();
}

// Commits whatever the builder left uncommitted (never a settings file),
// through the repository's own git hooks. Only settings files left over (an
// untracked .env.test) is nothing to commit, not a failure. What the hooks
// said when they refused it; null when it is committed or there was nothing.
export async function commitLeft(
  folder: string,
  message: string,
): Promise<string | null> {
  const git = (...args: string[]) => run("git", ["-C", folder, ...args]);
  if ((await git("status", "--porcelain")).trim() === "") return null;
  await stageAllButSettings(folder);
  if ((await git("diff", "--cached", "--name-only")).trim() === "") return null;
  return await refusal(git("commit", "--quiet", "-m", message));
}

// Puts the copy's work on the card's branch where the code lives, through
// the repository's own git hooks (a pre-push check runs here). Only work
// whose checks pass is pushed. What the hooks said when they refused it;
// null when it is pushed.
export async function pushBranch(
  folder: string,
  branch: string,
): Promise<string | null> {
  return await refusal(
    run("git", [
      "-C",
      folder,
      "push",
      "--quiet",
      "--force",
      "origin",
      `HEAD:refs/heads/${branch}`,
    ]),
  );
}

// The card's work committed and pushed, both through the git hooks; what
// they said when they refused it, null when it went.
export async function publishBranch(
  folder: string,
  card: { number: number; title: string },
): Promise<string | null> {
  return (
    (await commitLeft(folder, `#${String(card.number)} ${card.title}`)) ??
    (await pushBranch(folder, branchOf(card.number)))
  );
}

// After a turn: what the builder left, committed through the git hooks;
// what they refused is told as activity.
export async function commitTurn(
  folder: string,
  card: { number: number; title: string },
  onActivity: (line: string) => void,
): Promise<void> {
  const refused = await commitLeft(
    folder,
    `#${String(card.number)} ${card.title}`,
  );
  if (refused) onActivity(`The git hooks refused the commit: ${refused}`);
}

async function refusal(done: Promise<string>): Promise<string | null> {
  try {
    await done;
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(/^git .*? failed: /, "");
  }
}

// The working copy of a lane's place: "build", then "build-2", "build-3" ….
export function copyName(lane: "chat" | "build", place: number): string {
  return place === 1 ? lane : `${lane}-${String(place)}`;
}
