// What Build says about the issues Kobble knows, worked out from what the
// server sends: the kind's pill, what a card is for (or where a fix came
// from), the answer to "did it work?", and the lines of its dialog. Kept
// apart from the components so it is checked on its own.

import type { Answered, CardView, SeenDraft, TicketView } from "../api.ts";
import { t } from "../i18n/i18n.ts";
import type { IdeaStage } from "../lib/stages.ts";
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
      lead: t("build:ticket.for"),
      parts: ticket.for.map((problem) => ({
        title: problem.title,
        href: problem.story
          ? understandHash(problem.persona, problem.story)
          : null,
      })),
    };
  if (ticket.from)
    return {
      lead: t("build:ticket.from"),
      parts: [{ title: ticket.from, href: null }],
    };
  return {
    lead: "",
    parts: [{ title: t("build:ticket.noProblem"), href: null }],
  };
}

const OUTCOMES = {
  yes: { tone: "solved", words: "build:ticket.worked" },
  no: { tone: "wrong", words: "build:ticket.didntWork" },
  unchecked: { tone: "none", words: "build:ticket.unchecked" },
} as const;

export function outcomeOf(outcome: NonNullable<TicketView["outcome"]>): {
  tone: Tone;
  words: string;
} {
  const { tone, words } = OUTCOMES[outcome.worked];
  return { tone, words: t(words) };
}

// Where an idea's ticket is, on the idea's pipeline: worked or didn't once
// answered; in the app once closed or in the board's last column (or
// answered "didn't check"); being built before.
export function ticketStage(
  card: Pick<CardView, "closed" | "stage">,
  ticket: Pick<TicketView, "outcome">,
): IdeaStage {
  const worked = ticket.outcome?.worked;
  if (worked === "yes") return "worked";
  if (worked === "no") return "didntWork";
  if (worked === "unchecked" || card.closed || card.stage === "done")
    return "inApp";
  return "building";
}

// The dialog's first line: the card, and since when it is in Build (what
// it is for follows, with links).
export function ticketLine(
  ticket: Pick<TicketView, "since">,
  title: string,
): string {
  return ticket.since
    ? t("build:ticket.since", { title, since: ticket.since })
    : t("build:ticket.only", { title });
}

// Under the draft of what was seen: what the kobold is doing, what it drew
// from, or why there is nothing to start from.
export function seenNote(draft: SeenDraft | null): string {
  if (draft === null) return t("build:didItWork.looking");
  if (draft.problem)
    return t("build:didItWork.couldNotLook", { problem: draft.problem });
  if (draft.heard === 0) return t("build:didItWork.nothingHeard");
  return t("build:didItWork.draft", { count: draft.heard });
}

// The line on Build once answered, green when it worked.
export function saidOf(answered: Answered): { text: string; good: boolean } {
  return {
    text: answered.said,
    good: answered.outcome.worked === "yes",
  };
}
