// One card of the Factory page, opened beside the board: its plan, what it
// is about, the conversation with the builder (who said what, the factory's
// notes in words), the pull request, and its type, which can be changed;
// a card not wanted any more is deleted (closed, off the board).

import type { Route } from "../add-ons/add-on.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { field } from "../asked.ts";
import { branchOf } from "../builder/branches.ts";
import { type Note, readNote, stripMarker } from "../builder/protocol.ts";
import { type PullRequests, RESOLVE_ASK } from "../builder/pull-requests.ts";
import {
  aboutOf,
  CARD_TYPES,
  type CardDetail,
  type CardType,
  planOf,
  typeOf,
} from "../cards/cards.ts";
import { cardsFor } from "../cards/cards-for.ts";
import { Refused } from "../refused.ts";

export type CardPanel = {
  number: number;
  title: string;
  url: string;
  column: string;
  // In the builder's column: it cannot be deleted meanwhile.
  building: boolean;
  type: CardType | null;
  // What the card asks for, without the agreed plan; the plan apart.
  about: string;
  plan: string | null;
  // Where the work is, in a line, from the factory's last note.
  status: string;
  said: {
    by: "factory" | "person";
    author: string;
    text: string;
    at: string;
  }[];
  pullRequest: { url: string; state: string; draft: boolean } | null;
};

const STATUS: Partial<Record<Note, string>> = {
  question: "The coach asks you something about the plan",
  "plan-agreed": "The plan is agreed: move it to To do to build it",
  blocked: "The builder stopped and waits for your answer",
  failed: "The builder could not finish: comment to let it try again",
  started: "The builder is building it",
  progress: "The builder is building it, session by session",
  "moved-back": "Moved back to Planning",
  "review-ready": "Built: the pull request is ready for your review",
  fixed: "Review comments answered",
  "checks-failed": "Built, but some checks still fail",
  "out-of-sessions":
    "Not finished after its sessions: continue to give it more",
  paused: "Paused: Claude's usage limit; it carries on by itself",
};

export function factoryCardRoutes(
  factory: string,
  cli: Cli,
  // Where the code lives: the card's pull request is there.
  codeHost: () => PullRequests,
): Record<string, Route> {
  const connected = () => {
    const found = cardsFor(factory, cli);
    if ("problem" in found) throw new Refused(found.problem);
    return found;
  };
  return {
    "GET /api/kobble/factory/card": async (_body, url) => {
      const number = Number(url.searchParams.get("number"));
      if (!Number.isInteger(number)) throw new Refused("Say which card.");
      const { cards } = connected();
      // Both at once: each is a call to GitHub.
      const [card, pr] = await Promise.all([
        cards.show(number),
        codeHost().find(branchOf(number)),
      ]);
      return panelOf(card, pr);
    },
    "POST /api/kobble/factory/type": async (body) => {
      const number = Number((body as { number?: unknown } | null)?.number);
      const asked = field(body, "type");
      const type = CARD_TYPES.find((one) => one === asked) ?? null;
      if (!Number.isInteger(number) || (asked !== "none" && !type))
        throw new Refused("Say which card and which type.");
      const { cards } = connected();
      if (!cards.setType) throw new Refused("This board cannot keep types.");
      await cards.setType(number, type);
      return { type };
    },
    // Resolve: the owner's ask on the card, and the card back in To do;
    // the builder takes it into In progress, where it works, brings in main
    // and settles the clash, then puts it in Review again.
    "POST /api/kobble/factory/resolve": async (body) => {
      const number = Number((body as { number?: unknown } | null)?.number);
      if (!Number.isInteger(number)) throw new Refused("Say which card.");
      const { cards } = connected();
      const pr = await codeHost().find(branchOf(number));
      if (pr?.state !== "OPEN")
        throw new Refused(`#${String(number)} has no open pull request.`);
      await cards.comment(number, RESOLVE_ASK);
      await cards.move(number, "todo");
      return { moved: "todo" };
    },
    "POST /api/kobble/factory/delete": async (body) => {
      const number = Number((body as { number?: unknown } | null)?.number);
      if (!Number.isInteger(number)) throw new Refused("Say which card.");
      const { cards } = connected();
      if (!cards.remove) throw new Refused("This board cannot delete cards.");
      await cards.remove(number);
      return { deleted: number };
    },
  };
}

function panelOf(
  card: CardDetail,
  pr: { url: string; state: string; draft: boolean } | null,
): CardPanel {
  const plan = planOf(card.body);
  const about = aboutOf(card.body);
  const notes = card.comments.flatMap((c) => readNote(c.body) ?? []);
  const last = notes.at(-1);
  return {
    number: card.number,
    title: card.title,
    url: card.url,
    column: card.column,
    building: card.stage === "doing",
    type: typeOf(card.labels),
    about,
    plan,
    status: (last && STATUS[last]) ?? (plan ? "Planned" : "Not planned yet"),
    said: card.comments.map((c) => ({
      by: readNote(c.body) ? "factory" : "person",
      author: c.author,
      text: stripMarker(c.body),
      at: c.at,
    })),
    pullRequest: pr ? { url: pr.url, state: pr.state, draft: pr.draft } : null,
  };
}
