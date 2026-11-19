// What Home shows, worked out from what the server sends: what waits for
// the owner (a pull request to review, a question on a card, an exploration
// with a next step, new signals to sort), and the loop from what came in to
// what is done, each stage with its count and its latest two. Kept apart
// from the page so it is checked on its own.

import type { WorkView } from "../api.ts";

export type WaitingItem = {
  id: string;
  kind: "Review" | "Answer" | "Continue" | "Sort";
  title: string;
  about: string;
  // The card's number ("#55"), when it is one.
  number: string | null;
  href: string;
  // A pull request on GitHub, opened in a new tab.
  outside: boolean;
};

type Row = {
  id: string;
  title: string;
  line: string | null;
  busy: string | null;
};

export type HomeInput = {
  work: WorkView | null;
  signals: { text: string }[];
  fresh: number;
  exploring: Row[];
};

// The most there is in the list; the rest wait on their pages.
const MOST = 6;

export function waitingOf(input: HomeInput): WaitingItem[] {
  const { work } = input;
  const cards = (work?.cards ?? []).filter((card) => !card.closed);
  const review: WaitingItem[] = cards
    .filter((card) => card.stage === "review")
    .map((card) => ({
      id: `review-${String(card.number)}`,
      kind: "Review",
      title: card.title,
      about: card.pullRequest
        ? "Built, and its pull request waits for your review"
        : "Waits for your review",
      number: `#${String(card.number)}`,
      href: card.pullRequest ?? card.url,
      outside: true,
    }));
  const answer: WaitingItem[] = (work?.asking ?? []).map((asking) => ({
    id: `answer-${String(asking.number)}`,
    kind: "Answer",
    title: asking.title,
    about: asking.ask?.question ?? "The builder stopped and asks you",
    number: `#${String(asking.number)}`,
    href: "#build",
    outside: false,
  }));
  const go: WaitingItem[] = input.exploring
    .filter((row) => row.line && !row.busy)
    .map((row) => ({
      id: `explore-${row.id}`,
      kind: "Continue",
      title: row.title,
      about: row.line ?? "",
      number: null,
      href: `#explore/${encodeURIComponent(row.id)}`,
      outside: false,
    }));
  const sort: WaitingItem[] =
    input.fresh > 0
      ? [
          {
            id: "sort",
            kind: "Sort",
            title: `${String(input.fresh)} new ${input.fresh === 1 ? "signal" : "signals"}`,
            about: input.signals[0]?.text ?? "",
            number: null,
            href: "#signals",
            outside: false,
          },
        ]
      : [];
  return [...answer, ...review, ...go, ...sort].slice(0, MOST);
}

export type Stage = {
  id: "signals" | "explore" | "build" | "done";
  name: string;
  count: number;
  // What the count is ("new", "being explored", "building · 1 to review").
  says: string;
  // The latest two.
  items: string[];
  href: string;
};

export function loopOf(input: HomeInput): Stage[] {
  const cards = input.work?.cards ?? [];
  const open = cards.filter((card) => !card.closed);
  const building = open.filter(
    (card) => card.stage === "todo" || card.stage === "doing",
  );
  const review = open.filter((card) => card.stage === "review");
  const done = cards.filter((card) => card.closed || card.stage === "done");
  const two = (titles: string[]) => titles.slice(0, 2);
  return [
    {
      id: "signals",
      name: "Signals",
      count: input.fresh,
      says: "new",
      items: two(input.signals.map((signal) => signal.text)),
      href: "#signals",
    },
    {
      id: "explore",
      name: "Explorations",
      count: input.exploring.length,
      says: "being explored",
      items: two(input.exploring.map((row) => row.title)),
      href: "#explore",
    },
    {
      id: "build",
      name: "Factory",
      count: building.length,
      says:
        review.length > 0
          ? `to build · ${String(review.length)} to review`
          : "to build",
      items: two([...review, ...building].map((card) => card.title)),
      href: "#build",
    },
    {
      id: "done",
      name: "Done",
      count: done.length,
      says: "merged",
      items: two(done.map((card) => card.title)),
      href: "#build",
    },
  ];
}

// How the product is doing, in a line: the light of its parts and what
// the builder works on.
export function statusLine(
  product: { light: string; running: number; shown: number },
  building: string | null,
): string {
  const work = building ? `Bolt is building ${building}` : "Bolt is resting";
  if (product.shown === 0) return `No product to run yet · ${work}`;
  if (product.light === "problem")
    return `Something needs you on System · ${work}`;
  if (product.light === "starting") return `Starting the product · ${work}`;
  if (product.running === product.shown)
    return `The product is running · ${work}`;
  if (product.running === 0) return `The product is stopped · ${work}`;
  return `${String(product.running)} of ${String(product.shown)} parts are running · ${work}`;
}
