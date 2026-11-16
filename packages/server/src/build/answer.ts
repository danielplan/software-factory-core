// What a person does on Build: answers "did it work?" for an idea's ticket
// (yes, the problem is solved; no; or nobody checked), and makes a fix
// ticket for a bug or an update sorted in Understand and sent to Build.
// The answer is an outcome record, with what was seen, and a comment on the
// issue; where the problem and the idea stand follows from it (the records'
// derive.ts): yes solves the problem and ends its story, no leaves the
// problem open and the idea did not work.

import {
  type Outcome,
  type RecordStore,
  RecordsRefused,
} from "@software-factory/core";
import { z } from "zod";

import type { Cards } from "../cards/cards.ts";
import { markComment } from "../builder/protocol.ts";
import { Refused } from "../refused.ts";
import { heardSince, sourcesOf } from "./seen.ts";

export const answerSchema = z.strictObject({
  issue: z.number().int().positive(),
  worked: z.enum(["yes", "no", "unchecked"]),
  // What was seen; may be empty.
  seen: z.string().default(""),
});

export type Answer = z.infer<typeof answerSchema>;

export type Answered = {
  outcome: Outcome;
  // A line for the Build page on what changed.
  said: string;
  // Why the comment on the issue could not be written, when it could not.
  problem: string | null;
};

const ANSWER_WORDS: Record<Outcome["worked"], string> = {
  yes: "Yes, the problem is solved.",
  no: "No, it did not work.",
  unchecked: "Nobody checked.",
};

// The outcome first (the records are what Kobble goes by), then the
// comment on the issue, through the connected board's cards.
export async function answerDidItWork(
  store: RecordStore,
  cards: () => Cards,
  answer: Answer,
  by: string,
): Promise<Answered> {
  const records = store.all();
  const link = records.ticketLinks.find((t) => t.issue === answer.issue);
  if (!link)
    throw new Refused(`Kobble knows no issue #${String(answer.issue)}.`);
  if (link.kind !== "idea")
    throw new Refused(
      `A ${link.kind} is for no problem: it has no “did it work?”.`,
    );
  if (records.outcomes.some((o) => o.issue === answer.issue))
    throw new Refused(`#${String(answer.issue)} has its answer already.`);
  const seen = answer.seen.trim();
  const sources = sourcesOf(heardSince(records, link));
  const outcome = store.put("outcomes", {
    issue: answer.issue,
    worked: answer.worked,
    seen: seen ? { text: seen, source: sources.join(",") || by } : null,
    by,
    on: today(),
  });
  const comment = [
    `**Did it work?** ${ANSWER_WORDS[answer.worked]}`,
    ...(seen ? ["", `**Seen:** ${seen}`] : []),
    "",
    `Answered in Kobble by ${by}.`,
  ].join("\n");
  let problem: string | null = null;
  try {
    await cards().comment(answer.issue, markComment(comment, "did-it-work"));
  } catch (error) {
    problem = `The answer is saved, but the comment on #${String(answer.issue)} could not be written: ${error instanceof Error ? error.message : String(error)}`;
  }
  return {
    outcome,
    said: saidOf(answer.worked, link.problems.length),
    problem,
  };
}

function saidOf(worked: Outcome["worked"], problems: number): string {
  if (worked === "unchecked") return "Saved as not checked.";
  if (problems === 0)
    return worked === "yes"
      ? "Marked as worked in Explore."
      : "Marked as didn't work in Explore.";
  return worked === "yes"
    ? "Marked solved in Understand."
    : "The problem stays open. Try another version in Explore.";
}

const FIX_MARK = /<!-- factory:kobble signal=(\S+) -->/;

// The signal a fix or an update ticket's text carries in its hidden mark;
// none when it has none.
export function fixMarkIn(body: string): string | null {
  return FIX_MARK.exec(body)?.[1] ?? null;
}

// A bug or an update sent to Build from Understand, as a new issue (it
// starts in Backlog) with the signal's id in a hidden mark; the records
// keep a ticket link to it, and the signal goes to the ticket.
export async function makeFixTicket(
  store: RecordStore,
  cards: () => Cards,
  id: string,
  by: string,
): Promise<{ issue: number; url: string }> {
  const signal = store.get("signals", id);
  if (!signal) throw new Refused(`There is no signal “${id}”.`);
  if (signal.wentTo?.to !== "build")
    throw new Refused(
      "Only a bug or an update sent to Build gets a fix ticket.",
    );
  const kind = signal.sortedAs === "update" ? "update" : "fix";
  const source = store.get("sources", signal.source)?.name ?? signal.source;
  const body = [
    `**What came in:** ${signal.text}`,
    "",
    `**From:** ${[source, signal.when].filter(Boolean).join(", ")}`,
    ...(signal.why ? ["", `**Why it is a ${kind}:** ${signal.why}`] : []),
    "",
    `Made in Kobble by ${by}.`,
    "",
    `<!-- factory:kobble signal=${signal.id} -->`,
  ].join("\n");
  const card = await cards().create(titleOf(signal.text), body);
  keptLink(card.number, () =>
    store.write((writer) => {
      writer.put("ticketLinks", {
        issue: card.number,
        kind,
        from: { signal: signal.id },
        on: today(),
      });
      writer.put("signals", {
        ...signal,
        wentTo: { to: "ticket", issue: card.number },
      });
    }),
  );
  return { issue: card.number, url: card.url };
}

// An issue's title from what was said: its first sentence, without quotes,
// at most about eighty letters.
export function titleOf(text: string): string {
  const plain = text.replace(/[“”"]/g, "").trim();
  const end = plain.search(/[.!?](\s|$)/);
  const first = end >= 0 ? plain.slice(0, end + 1) : plain;
  if (first.length <= 80) return first;
  const cut = first.slice(0, 80);
  const space = cut.lastIndexOf(" ");
  return `${space > 40 ? cut.slice(0, space) : cut}…`;
}

// The ticket link to an issue just made; refused, with the issue's number,
// when the records do not take it.
export function keptLink(issue: number, write: () => unknown): void {
  try {
    write();
  } catch (error) {
    if (error instanceof RecordsRefused)
      throw new Refused(
        `The issue #${String(issue)} is made, but the records refused it: ${error.message}`,
      );
    throw error;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
