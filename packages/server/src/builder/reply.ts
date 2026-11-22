// The builder's reply to the owner's question on a stuck card: one
// read-only turn in a copy of the card's branch (main when the branch has
// nothing yet), with the card and its conversation. What it says goes on
// the card as it is; the card stays stuck until the owner sends it on.

import type { Claude } from "@software-factory/core";

import { branchOf } from "./branches.ts";
import type { BoardCard } from "./decide.ts";
import { replyPrompt } from "./prompts.ts";
import { pauseOn } from "./usage-limit.ts";

export type ReadCopy = {
  path: string;
  // At the latest main, or at a branch when one is given.
  prepareReadOnly: (branch?: string) => Promise<void>;
};

const REPLY_TIME_MS = 15 * 60_000;

export async function replyTo(
  card: BoardCard,
  at: { chat: () => Promise<ReadCopy>; name: string },
  options: {
    claude: Claude;
    model?: () => string | undefined;
    now?: () => Date;
  },
  onActivity: (line: string) => void,
): Promise<string> {
  const copy = await at.chat();
  const model = options.model?.();
  await copy
    .prepareReadOnly(branchOf(card.number))
    .catch(() => copy.prepareReadOnly());
  const result = await options.claude.run({
    cwd: copy.path,
    prompt: replyPrompt(card, at.name),
    readOnly: true,
    onActivity,
    timeLimitMs: REPLY_TIME_MS,
    ...(model ? { model } : {}),
  });
  if (!result.ok) {
    pauseOn(result.error, options.now?.() ?? new Date());
    return `The builder could not answer: ${result.error ?? "Claude Code stopped"}. Ask again.`;
  }
  return result.text.trim() || "(The builder had nothing to say.)";
}
