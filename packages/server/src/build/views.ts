// What the Build page shows of the records beside the board: each GitHub
// issue Kobble knows (an idea's version, a fix or an update), with what it
// is for and whether it worked; and the signals sent to Build that have no
// ticket yet. A card on the board that Kobble does not know shows as it
// always did.

import type {
  Idea,
  Outcome,
  Records,
  TicketLink,
} from "@software-factory/core";

// A problem an idea's ticket is for, with the story that breaks at it.
export type ProblemFor = {
  id: string;
  title: string;
  persona: string;
  story: string | null;
};

export type TicketView = {
  issue: number;
  kind: TicketLink["kind"];
  // The kind in a word, with the version for an idea ("Idea · B").
  label: string;
  idea: Pick<Idea, "id" | "title" | "weThink"> | null;
  for: ProblemFor[];
  // Where a fix or an update came from: its signal's source.
  from: string | null;
  // The day it went to Build, when known.
  since: string;
  // The answer to "did it work?", once given.
  outcome: Pick<Outcome, "worked" | "by" | "on"> | null;
};

// A bug or an update sent to Build from Understand, with no ticket yet.
export type WaitingFix = {
  signal: string;
  text: string;
  kind: "fix" | "update";
  source: string;
};

export type BuildView = { tickets: TicketView[]; waiting: WaitingFix[] };

const KIND_WORDS = { idea: "Idea", fix: "Fix", update: "Update" } as const;

// GET /api/build
export function buildView(records: Records): BuildView {
  return {
    tickets: records.ticketLinks.map((link) => ticketView(records, link)),
    waiting: records.signals
      .filter((signal) => signal.wentTo?.to === "build")
      .map((signal) => ({
        signal: signal.id,
        text: signal.text,
        kind: signal.sortedAs === "update" ? "update" : "fix",
        source: sourceName(records, signal.source),
      })),
  };
}

// The issues Kobble waits for "did it work?" about: an idea's tickets with
// no answer yet. A fix or an update is for no problem, so it is never asked.
export function waitingForAnswer(records: Records): Set<number> {
  const answered = new Set(records.outcomes.map((o) => o.issue));
  return new Set(
    records.ticketLinks
      .filter((link) => link.kind === "idea" && !answered.has(link.issue))
      .map((link) => link.issue),
  );
}

export function ticketView(records: Records, link: TicketLink): TicketView {
  const { from } = link;
  const idea =
    "idea" in from ? records.ideas.find((one) => one.id === from.idea) : null;
  const signal =
    "signal" in from
      ? records.signals.find((one) => one.id === from.signal)
      : null;
  const outcome = records.outcomes.find((o) => o.issue === link.issue);
  return {
    issue: link.issue,
    kind: link.kind,
    label:
      "version" in from
        ? `${KIND_WORDS.idea} · ${from.version}`
        : KIND_WORDS[link.kind],
    idea: idea
      ? { id: idea.id, title: idea.title, weThink: idea.weThink }
      : null,
    for: link.problems.map((id) => problemFor(records, id)),
    from: signal ? sourceName(records, signal.source) : null,
    since: link.on,
    outcome: outcome
      ? { worked: outcome.worked, by: outcome.by, on: outcome.on }
      : null,
  };
}

function problemFor(records: Records, id: string): ProblemFor {
  const problem = records.problems.find((p) => p.id === id);
  const story = records.stories.find(
    (s) => s.problem === id && s.wrong === null,
  );
  return {
    id,
    title: problem?.title ?? id,
    persona: problem?.persona ?? "",
    story: story?.id ?? null,
  };
}

function sourceName(records: Records, id: string): string {
  return records.sources.find((source) => source.id === id)?.name ?? id;
}
