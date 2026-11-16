// What Build says about the issues Kobble knows, worked out from what the
// server sends: the kind's pill, what a card is for (or where a fix came
// from), the answer to "did it work?", and the lines of its dialog. Kept
// apart from the components so it is checked on its own.

import type { Answered, SeenDraft, TicketView } from "../api.ts";
import { understandHash } from "../lib/routes.ts";
import type { Tone } from "../understand/view.ts";

const KIND_TONES: Record<TicketView["kind"], Tone> = {
  idea: "solving",
  fix: "open",
  update: "none",
};

export function kindTone(kind: TicketView["kind"]): Tone {
  return KIND_TONES[kind];
}

export type ForPart = { title: string; href: string | null };

// Under a card's title: "For:" its problems, each linked to the story that
// breaks at it in Understand; "From:" where a fix or an update came from;
// or that an idea is for no problem yet.
export function forOf(ticket: Pick<TicketView, "for" | "from">): {
  lead: string;
  parts: ForPart[];
} {
  if (ticket.for.length > 0)
    return {
      lead: "For:",
      parts: ticket.for.map((problem) => ({
        title: problem.title,
        href: problem.story
          ? understandHash(problem.persona, problem.story)
          : null,
      })),
    };
  if (ticket.from)
    return { lead: "From:", parts: [{ title: ticket.from, href: null }] };
  return {
    lead: "",
    parts: [{ title: "No problem behind it yet", href: null }],
  };
}

const OUTCOMES: Record<
  NonNullable<TicketView["outcome"]>["worked"],
  { tone: Tone; words: string }
> = {
  yes: { tone: "solved", words: "It worked" },
  no: { tone: "wrong", words: "It didn't work" },
  unchecked: { tone: "none", words: "Not checked" },
};

export function outcomeOf(outcome: NonNullable<TicketView["outcome"]>): {
  tone: Tone;
  words: string;
} {
  return OUTCOMES[outcome.worked];
}

// The dialog's first line: the card, and since when it is in Build (what
// it is for follows, with links).
export function ticketLine(
  ticket: Pick<TicketView, "since">,
  title: string,
): string {
  return ticket.since
    ? `“${title}”, in Build since ${ticket.since}.`
    : `“${title}”.`;
}

// Under the draft of what was seen: what the kobold is doing, what it drew
// from, or why there is nothing to start from.
export function seenNote(draft: SeenDraft | null): string {
  if (draft === null) return "The kobold is looking at what was heard since…";
  if (draft.problem)
    return `The kobold could not look: ${draft.problem} Say what you saw.`;
  if (draft.heard === 0)
    return "Nothing was heard about it since it went to Build. Say what you saw, if anything.";
  const signals =
    draft.heard === 1 ? "1 signal" : `${String(draft.heard)} signals`;
  return `The kobold's draft, from ${signals} heard since. Change it as you like.`;
}

// The line on Build once answered, green when it worked.
export function saidOf(answered: Answered): { text: string; good: boolean } {
  return {
    text: answered.said,
    good: answered.outcome.worked === "yes",
  };
}
