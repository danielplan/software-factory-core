// The builder's reply to the owner's question on a stuck card: one
// read-only turn in a copy of the card's branch (main when the branch has
// nothing yet), with the card and its conversation. What it says goes on
// the card as it is; the card stays stuck until the owner sends it on.

import { randomUUID } from "node:crypto";

import type { Claude } from "@software-factory/core";

import { branchOf } from "./branches.ts";
import type { BoardCard } from "./decide.ts";
import { replyPrompt } from "./prompts.ts";
import { Paused, pauseOn } from "./usage-limit.ts";

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
  try {
    return await answered(card, at, options, onActivity);
  } catch (error) {
    // Anything but the usage limit is said on the card: the question is
    // answered once, never tried again on every reading.
    if (error instanceof Paused) throw error;
    return couldNot(error instanceof Error ? error.message : String(error));
  }
}

async function answered(
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
    // Its own conversation, started fresh each time.
    session: { id: randomUUID(), resume: false },
    onActivity,
    timeLimitMs: REPLY_TIME_MS,
    ...(model ? { model } : {}),
  });
  if (!result.ok) {
    pauseOn(result.error, options.now?.() ?? new Date());
    return couldNot(result.error ?? "Claude Code stopped");
  }
  return result.text.trim() || "(The builder had nothing to say.)";
}

function couldNot(why: string): string {
  return `The builder could not answer: ${why}. Ask again.`;
}
