// What the coach and the builder are asked: only the task, the card and its
// conversation, and the status lines the factory understands. How to work
// through the board is the factory skill's guide (board.md), so it changes
// with the skills, not this code. The card's thread is the memory: each job
// gets the whole conversation instead of a saved session.

import { branchOf } from "./branches.ts";
import { type BoardCard, type Message, reviewTimeline } from "./decide.ts";
import { isFactory, stripMarker } from "./protocol.ts";

const GUIDE =
  "the factory skill's guide board.md (in .claude/skills/factory/ or .agents/skills/factory/)";

const SHARED = `You are the software factory, started on the owner's computer while nobody watches.
Read ${GUIDE} first and follow it: it has the rules for working through the board and for this task.`;

export function planPrompt(card: BoardCard): string {
  return `${SHARED}

## Your task: planning card #${String(card.number)}

The card is in **Planning**. Follow the guide's "Planning" section.

${cardText(card)}

${answer("question", "plan-agreed", "blocked")}`;
}

export function buildPrompt(card: BoardCard, continued: boolean): string {
  const earlier = continued
    ? "; earlier work on this branch exists: continue from it (read the run file first)"
    : "";
  return `${SHARED}

## Your task: building card #${String(card.number)}

The owner approved the plan by moving the card to **Ready**. Follow the guide's "Building" section.
You are on branch \`${branchOf(card.number)}\` in the factory's own working copy${earlier}.

${cardText(card)}

${answer("done", "blocked", "continue")}`;
}

export function feedbackPrompt(card: BoardCard): string {
  return `${SHARED}

## Your task: review comments on card #${String(card.number)}

The work is in pull request #${String(card.pullRequest?.number ?? "")} on branch \`${branchOf(card.number)}\`, and the card is in **Review**. Follow the guide's "Review comments" section.

${cardText(card, reviewTimeline(card))}

${answer("done", "blocked")}`;
}

export function fixChecksPrompt(
  card: BoardCard,
  report: string,
  round: number,
  rounds: number,
): string {
  return `${SHARED}

## Your task: make the checks pass for card #${String(card.number)} (round ${String(round)} of ${String(rounds)})

You are on branch \`${branchOf(card.number)}\`. The factory ran the checks before the pull request, and these failed. There is no pull request until every one passes. Follow the guide's "The checks before the pull request" section: every red check is yours to fix, also one that already failed before your change.

${report}

${cardText(card, reviewTimeline(card))}

${answer("done", "blocked")}`;
}

// For a turn that ended without its status line: the job is not done.
export const CARRY_ON = `Your turn ended without a STATUS line, so the job is not finished, and nothing you started keeps running once your turn ends: there is no "later" and no one to tell you a command finished.
Carry on now: run what you were waiting for in the foreground and wait for it, fix what fails and run it again, until the task is done. Then end with the STATUS line your task asked for.`;

function answer(...statuses: string[]): string {
  const lines = statuses.map((s) => `\`STATUS: ${s}\``).join(" or ");
  return `## Your answer\n\nEnd with exactly one of these last lines: ${lines}.`;
}

function cardText(card: BoardCard, thread: Message[] = card.thread): string {
  const said = thread
    .map((m) => {
      const who = isFactory(m.body)
        ? "The factory (you, earlier)"
        : "The owner";
      const where = m.where === "card" ? "" : " on the pull request";
      return `### ${who}${where}, ${m.at}\n\n${stripMarker(m.body).trim()}`;
    })
    .join("\n\n");
  return `## The card: #${String(card.number)} ${card.title}

${card.url}

${card.body.trim() || "(no text)"}

## The conversation so far

${said || "(no comments yet)"}`;
}
