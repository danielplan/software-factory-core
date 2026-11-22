// One turn of the builder on a card's branch, in its working copy: the
// latest main brought in first (a clash goes to the builder to settle), the
// same conversation told to carry on when it stops halfway, and whatever it
// left committed through the repository's own git hooks, so a question or a
// review continues from it. Nothing is pushed here: only work whose checks
// pass goes where the code lives (jobs.ts). Claude's usage limit ends the
// turn as a pause.

import { randomUUID } from "node:crypto";

import type { Claude, Mcp } from "@software-factory/core";

import { branchOf, commitTurn } from "./branches.ts";
import type { CodeHost } from "./code-host.ts";
import type { BoardCard } from "./decide.ts";
import { CARRY_ON, clashPrompt } from "./prompts.ts";
import { linkRepositoryFiles, readStatusLine } from "./protocol.ts";
import { pauseOn } from "./usage-limit.ts";

export type BuildCopy = {
  path: string;
  prepareSharedBranch: (branch: string) => Promise<void>;
  // Where the branch is checked out outside the factory's own copies; none
  // when it is not.
  heldElsewhere: (branch: string) => Promise<string | null>;
  // The latest main merged in: the files that clash, none when it went in.
  bringInMain: () => Promise<string[]>;
  clashing: () => Promise<string[]>;
  abortMerge: () => Promise<void>;
};

export type TurnOptions = {
  claude: Claude;
  copy: BuildCopy;
  card: BoardCard;
  prompt: string;
  onActivity: (line: string) => void;
  model: string | undefined;
  timeLimitMs: number;
  // Where the code lives: the copy must push there, and files are linked
  // there.
  host: Pick<CodeHost, "originProblem" | "fileLink">;
  now: Date;
  // Its own browser, its only MCP server, so it never gets the person's
  // (their Claude Code's plugins and their browser profile).
  browser?: Mcp | null;
};

// Times a turn that stopped halfway is told to carry on.
const NUDGES = 2;

export async function builderTurn(
  options: TurnOptions,
): Promise<{ status: string; text: string }> {
  const { copy, card, onActivity, model } = options;
  const branch = branchOf(card.number);
  await copy.prepareSharedBranch(branch);
  // Pushed elsewhere, the work never reaches the board: said before any
  // session is spent on it.
  const elsewhere = await options.host.originProblem(copy.path);
  if (elsewhere) return { status: "blocked", text: elsewhere };
  const clashes = await copy.bringInMain();
  if (clashes.length > 0)
    onActivity(`Bringing main in: ${clashes.join(", ")} clash`);
  const prompt =
    clashes.length > 0
      ? `${options.prompt}\n\n${clashPrompt(clashes)}`
      : options.prompt;
  const id = randomUUID();
  const turn = (text: string, resume: boolean) =>
    options.claude.run({
      cwd: copy.path,
      prompt: text,
      readOnly: false,
      session: { id, resume },
      timeLimitMs: options.timeLimitMs,
      onActivity,
      ...(model ? { model } : {}),
      ...(options.browser ? { mcp: options.browser } : {}),
    });
  let result = await turn(prompt, false);
  // A turn that ends without its status line stopped halfway (waiting for
  // something it left running, say): the same conversation goes on.
  for (
    let nudge = 1;
    result.ok && !readStatusLine(result.text).status && nudge <= NUDGES;
    nudge++
  )
    result = await turn(CARRY_ON, true);
  const unsettled = await leftClashing(copy, clashes);
  await commitTurn(copy.path, card, onActivity);
  if (!result.ok) pauseOn(result.error, options.now);
  if (unsettled) return { status: "blocked", text: unsettled };
  if (!result.ok)
    return {
      status: "failed",
      text: `The build stopped: ${result.error ?? "Claude Code stopped"}.`,
    };
  const read = readStatusLine(result.text);
  return read.status
    ? {
        status: read.status,
        text: linkRepositoryFiles(read.text, (path) =>
          options.host.fileLink(branch, path),
        ),
      }
    : {
        status: "failed",
        text: `${read.text}\n\nThe builder stopped ${String(NUDGES + 1)} times without finishing.`,
      };
}

// A clash the builder did not settle: the merge is given up, and the owner
// is asked how the two sides go together.
async function leftClashing(
  copy: BuildCopy,
  clashes: string[],
): Promise<string | null> {
  if (clashes.length === 0) return null;
  const left = await copy.clashing();
  if (left.length === 0) return null;
  await copy.abortMerge();
  const files = left.map((file) => "`" + file + "`").join(", ");
  return `Bringing the latest main into this branch clashed in ${files}, and the builder could not settle it. Say how the two sides should go together, or settle it on the branch.`;
}
