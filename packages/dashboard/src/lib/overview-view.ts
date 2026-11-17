// What the Overview page says, worked out from what the server already
// sends: what needs a person now, by name and in order; the problems still
// open (Discovery) and the work on the board (Build), a few rows of each.
// Kept apart from the components so it is checked on its own.

import type {
  IdeaRow,
  KoboldNews,
  UnderstandOverview,
  WorkView,
} from "../api.ts";
import { t } from "../i18n/i18n.ts";
import { exploreHash } from "./routes.ts";
import { cardRows, ideaRows, problemRows, type Row } from "./rows.ts";

// One thing that waits for a person: what to do, about what, and where;
// its id is the card's number or the idea's, so two with the same title
// stay apart.
export type Need = { id: string; action: string; about: string; href: string };

export type Overview = {
  needs: Need[];
  discovery: { rows: Row[]; more: number };
  build: { rows: Row[]; more: number };
};

// How many rows each part shows; the rest is on its page.
const SHOWN = 5;

const firstOf = (rows: Row[]) => ({
  rows: rows.slice(0, SHOWN),
  more: Math.max(0, rows.length - SHOWN),
});

export function overviewOf(
  understand: UnderstandOverview | null,
  ideas: IdeaRow[] | null,
  work: WorkView | null,
): Overview {
  const open = problemRows(understand?.personas ?? []).filter((r) => !r.done);
  return {
    needs: needsOf(understand?.kobold ?? null, ideas ?? [], work),
    discovery: firstOf(open),
    build: firstOf(work ? cardRows(work.cards) : ideaRows(ideas ?? [])),
  };
}

// What waits for a person, the most pressing first: changes in the app
// that wait for "did it work?", work to review, an idea with a version
// picked to send, versions to choose between, what the kobold sorted.
function needsOf(
  news: KoboldNews | null,
  ideas: IdeaRow[],
  work: WorkView | null,
): Need[] {
  const cards = work?.cards ?? [];
  const toCheck = news ? news.toLookAt.length + news.newStories.length : 0;
  const ideasAt = (stage: IdeaRow["stage"], action: string): Need[] =>
    ideas
      .filter((idea) => idea.stage === stage)
      .map((idea) => ({
        id: `idea-${idea.id}`,
        action,
        about: idea.title,
        href: exploreHash(idea.id),
      }));
  const cardsWhere = (
    shown: (card: (typeof cards)[number]) => boolean,
    action: string,
  ): Need[] =>
    cards.filter(shown).map((card) => ({
      id: `card-${String(card.number)}`,
      action,
      about: card.title,
      href: "#build",
    }));
  const check: Need[] =
    toCheck > 0
      ? [
          {
            id: "check",
            action: t("overview:needs.look"),
            about: t("overview:needs.said", { count: toCheck }),
            href: "#understand",
          },
        ]
      : [];
  return [
    ...cardsWhere((card) => card.asks, t("overview:needs.didItWork")),
    ...cardsWhere(
      (card) => card.stage === "review",
      t("overview:needs.review"),
    ),
    ...ideasAt("picked", t("overview:needs.send")),
    ...ideasAt("versions", t("overview:needs.vote")),
    ...check,
  ].slice(0, SHOWN);
}
