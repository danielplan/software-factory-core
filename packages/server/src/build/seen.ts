// What was seen since an idea's ticket went to Build, for "did it work?":
// the signals behind its problems (to the problem or to one of its stories,
// never persona runs) heard since the ticket was made, and the kobold's
// draft of them in a sentence or two. The kobold only drafts; a person
// answers. When nothing was heard, or the kobold cannot look (Claude Code
// is not there), the draft is empty and the person writes what they saw.

import {
  type Records,
  type Signal,
  signalsBehind,
  type TicketLink,
} from "@software-factory/core";

import type { Kobold } from "../kobold/kobold.ts";

export type SeenDraft = {
  draft: string;
  // How many signals it was drawn from.
  heard: number;
  // Why the kobold could not draft it, when it could not.
  problem: string | null;
};

const DAY = /^\d{4}-\d{2}-\d{2}/;

// The signals behind the ticket's problems, heard since it was made. A
// signal whose day is not a date (“yesterday”, “4 Nov”) is kept: the
// kobold reads it with its day.
export function heardSince(records: Records, link: TicketLink): Signal[] {
  const behind = new Map<string, Signal>();
  for (const problem of link.problems)
    for (const signal of signalsBehind(records, problem))
      behind.set(signal.id, signal);
  return [...behind.values()].filter(
    (signal) =>
      !DAY.test(link.on) ||
      !DAY.test(signal.when) ||
      signal.when.slice(0, 10) >= link.on,
  );
}

// The sources the signals came from, by id.
export function sourcesOf(signals: Signal[]): string[] {
  return [...new Set(signals.map((signal) => signal.source))];
}

export async function draftSeen(
  records: Records,
  link: TicketLink,
  kobold: Kobold,
): Promise<SeenDraft> {
  const heard = heardSince(records, link);
  if (heard.length === 0) return { draft: "", heard: 0, problem: null };
  const drafted = await kobold.seen(
    link.issue,
    seenPrompt(records, link, heard),
  );
  return "problem" in drafted
    ? { draft: "", heard: heard.length, problem: drafted.problem }
    : { draft: drafted.text, heard: heard.length, problem: null };
}

export function seenPrompt(
  records: Records,
  link: TicketLink,
  heard: Signal[],
): string {
  const { from } = link;
  const idea =
    "idea" in from
      ? records.ideas.find((one) => one.id === from.idea)
      : undefined;
  const problems = records.problems.filter((p) => link.problems.includes(p.id));
  const name = (id: string) =>
    records.sources.find((source) => source.id === id)?.name ?? id;
  const day = link.on ? `on ${link.on}` : "on a day not known";
  const titles = problems.map((p) => `“${p.title}”`).join(", ");
  const line = (signal: Signal) => {
    const when = signal.when ? `, ${signal.when}` : "";
    return `- ${name(signal.source)}${when}: ${signal.text}`;
  };
  return [
    `Draft what was seen about the issue #${String(link.issue)}, as the understand skill says under "did it work?": one or two plain sentences, from the signals below only.`,
    "",
    `It went to Build ${day}, for: ${titles}.`,
    ...(idea ? [`The team thought: ${idea.weThink}`] : []),
    "",
    "Heard since (each from its source, on its day):",
    ...heard.map(line),
  ].join("\n");
}
