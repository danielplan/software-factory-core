// Before a card's pull request, the knowledge base kept with the code: a
// branch that changes code but none of the knowledge files (docs/, a
// context/ folder, a product's BLUEPRINT.md, AGENTS.md), and whose run file
// does not say why nothing there changes, gets one round of update-context.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { changedFiles } from "./checks.ts";
import type { BoardCard } from "./decide.ts";
import { knowledgePrompt, NOTHING_TO_KEEP } from "./prompts.ts";

const KNOWLEDGE = /(?:^|\/)(?:(?:docs|context)\/|(?:BLUEPRINT|AGENTS)\.md$)/;
const RUN = /^runs\/[^/]+\.md$/;
// Not code: the run's own files, pictures, Markdown such as WHATS-NEW.md.
const NOT_CODE = /^runs\/|\.(md|png|jpe?g|gif|webp)$/i;

// Whether the branch's changes still owe the knowledge base an update.
export function knowledgeOwed(
  files: string[],
  readRun: (file: string) => string,
): boolean {
  if (!files.some((file) => !NOT_CODE.test(file))) return false;
  if (files.some((file) => KNOWLEDGE.test(file))) return false;
  return !files
    .filter((file) => RUN.test(file))
    .some((file) => readRun(file).includes(NOTHING_TO_KEEP));
}

// The round, when the branch owes it (in the card's copy, against main).
export async function keepKnowledge(
  card: BoardCard,
  at: { name: string; build: () => Promise<{ path: string }> },
  base: () => Promise<string>,
  round: (prompt: string) => Promise<unknown>,
): Promise<void> {
  const copy = (await at.build()).path;
  if (await knowledgeOwedIn(copy, await base()))
    await round(knowledgePrompt(card, at.name));
}

async function knowledgeOwedIn(copy: string, base: string): Promise<boolean> {
  return knowledgeOwed(await changedFiles(copy, base), (file) => {
    try {
      return readFileSync(join(copy, file), "utf8");
    } catch {
      return "";
    }
  });
}
