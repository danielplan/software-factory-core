// What the Home page says, worked out from what the server already sends:
// what needs a person now, in order; the problems still open (Personas) and
// the work under way (Factory), a few rows of each. Kept apart from the
// components so it is checked on its own.

import type {
  IdeaRow,
  KoboldNews,
  UnderstandOverview,
  WorkView,
} from "../api.ts";
import { t } from "../i18n/i18n.ts";
import { exploreHash } from "./routes.ts";
import { cardRows, ideaRows, problemRows, type Row } from "./rows.ts";

// One thing that waits for a person: what it is about, what to do, and
// where; its id is the card's number or the idea's, so two with the same
// title stay apart.
export type Need = { id: string; action: string; about: string; href: string };

export type Overview = {
  needs: Need[];
  problems: { rows: Row[]; more: number };
  work: { rows: Row[]; more: number };
};

// What else waits elsewhere: the Check-up's open findings (only how
// serious each is) and the fixes sent to the Factory with no ticket yet.
export type Elsewhere = {
  findings: { severity: string }[];
  fixes: number;
};

const NOTHING_ELSEWHERE: Elsewhere = { findings: [], fixes: 0 };

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
  elsewhere: Elsewhere = NOTHING_ELSEWHERE,
): Overview {
  const open = problemRows(understand?.personas ?? []).filter((r) => !r.done);
  return {
    needs: needsOf(understand?.kobold ?? null, ideas ?? [], work, elsewhere),
    problems: firstOf(open),
    work: firstOf(work ? cardRows(work.cards) : ideaRows(ideas ?? [])),
  };
}

// What waits for a person, the most pressing first: serious problems the
// Check-up found; then, by name, changes in the app that wait for "did it
// work?", work to check, an idea ready for the Factory, versions to vote
// on; then, counted, fixes waiting for a ticket, new signals, the kobold's
// new stories and the Check-up's other findings. The counted ones always
// show; the named ones fill what is left of five.
function needsOf(
  news: KoboldNews | null,
  ideas: IdeaRow[],
  work: WorkView | null,
  elsewhere: Elsewhere,
): Need[] {
  const counted = countedNeeds(news, elsewhere);
  const named = namedNeeds(ideas, work).slice(
    0,
    Math.max(0, SHOWN - counted.length),
  );
  const [serious, ...rest] = counted;
  return serious?.id === "serious"
    ? [serious, ...named, ...rest]
    : [...named, ...counted];
}

function namedNeeds(ideas: IdeaRow[], work: WorkView | null): Need[] {
  const cards = work?.cards ?? [];
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
  return [
    ...cardsWhere((card) => card.asks, t("overview:needs.didItWork")),
    ...cardsWhere(
      (card) => card.stage === "review",
      t("overview:needs.review"),
    ),
    ...ideasAt("picked", t("overview:needs.send")),
    ...ideasAt("versions", t("overview:needs.vote")),
  ];
}

// The needs that are a number: each only when there is something to count.
function countedNeeds(news: KoboldNews | null, elsewhere: Elsewhere): Need[] {
  const serious = elsewhere.findings.filter(
    (one) => one.severity === "high",
  ).length;
  const other = elsewhere.findings.length - serious;
  const signals = news?.toLookAt.length ?? 0;
  const stories = news?.newStories.length ?? 0;
  const look = t("overview:needs.look");
  const all: (Need & { count: number })[] = [
    {
      id: "serious",
      count: serious,
      action: look,
      about: t("overview:needs.serious", { count: serious }),
      href: "#checks",
    },
    {
      id: "fixes",
      count: elsewhere.fixes,
      action: t("overview:needs.ticket"),
      about: t("overview:needs.fixes", { count: elsewhere.fixes }),
      href: "#build",
    },
    {
      id: "signals",
      count: signals,
      action: look,
      about: t("overview:needs.signals", { count: signals }),
      href: "#signals",
    },
    {
      id: "stories",
      count: stories,
      action: look,
      about: t("overview:needs.stories", { count: stories }),
      href: "#understand",
    },
    {
      id: "found",
      count: other,
      action: look,
      about: t("overview:needs.found", { count: other }),
      href: "#checks",
    },
  ];
  return all
    .filter((one) => one.count > 0)
    .map(({ id, action, about, href }) => ({ id, action, about, href }));
}
