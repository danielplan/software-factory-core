// What Home shows, worked out from what the server sends: what waits for
// the owner (a pull request to review, a question on a card, a card the
// builder got stuck on, an exploration
// with a next step, new signals to sort), and the loop from what came in to
// what is done, each stage with its count and its latest two. Kept apart
// from the page so it is checked on its own.

import type { WorkView } from "../api.ts";
import { reasonOf } from "../factory/stuck-view.ts";
import { ENGLISH, type Messages } from "../i18n/messages.ts";

type Words = Messages["home"];

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

export function waitingOf(
  input: HomeInput,
  m: Words = ENGLISH.home,
  why: Messages["builder"]["why"] = ENGLISH.builder.why,
): WaitingItem[] {
  const { work } = input;
  const cards = (work?.cards ?? []).filter((card) => !card.closed);
  const review: WaitingItem[] = cards
    .filter((card) => card.stage === "review")
    .map((card) => ({
      id: `review-${String(card.number)}`,
      kind: "Review",
      title: card.title,
      about: card.pullRequest ? m.review.built : m.review.waits,
      number: `#${String(card.number)}`,
      href: card.pullRequest ?? card.url,
      outside: true,
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
            title: m.newSignals(input.fresh),
            about: input.signals[0]?.text ?? "",
            number: null,
            href: "#signals",
            outside: false,
          },
        ]
      : [];
  return [...answersOf(work, m, why), ...review, ...go, ...sort].slice(0, MOST);
}

// The builder's questions, then the cards it got stuck on (they wait for a
// hint), each answered on the Factory page.
function answersOf(
  work: WorkView | null,
  m: Words,
  why: Messages["builder"]["why"],
): WaitingItem[] {
  const item = (number: number, title: string, about: string) => ({
    id: `answer-${String(number)}`,
    kind: "Answer" as const,
    title,
    about,
    number: `#${String(number)}`,
    href: "#build",
    outside: false,
  });
  return [
    ...(work?.asking ?? []).map((asking) =>
      item(asking.number, asking.title, asking.ask?.question ?? m.asks),
    ),
    ...(work?.stuck ?? []).map((one) =>
      item(one.number, one.title, reasonOf(one, why)),
    ),
  ];
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

export function loopOf(
  input: HomeInput,
  m: Words = ENGLISH.home,
  pages: Messages["shell"]["pages"] = ENGLISH.shell.pages,
): Stage[] {
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
      name: pages.signals,
      count: input.fresh,
      says: m.stages.newSignals,
      items: two(input.signals.map((signal) => signal.text)),
      href: "#signals",
    },
    {
      id: "explore",
      name: pages.explore,
      count: input.exploring.length,
      says: m.stages.exploring,
      items: two(input.exploring.map((row) => row.title)),
      href: "#explore",
    },
    {
      id: "build",
      name: pages.build,
      count: building.length,
      says:
        review.length > 0
          ? m.stages.toBuildAndReview(review.length)
          : m.stages.toBuild,
      items: two([...review, ...building].map((card) => card.title)),
      href: "#build",
    },
    {
      id: "done",
      name: m.stages.done,
      count: done.length,
      says: m.stages.merged,
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
  m: Words = ENGLISH.home,
): string {
  const { line } = m;
  const work = building ? line.building(building) : line.resting;
  return `${productLine(product, line)} · ${work}`;
}

function productLine(
  product: { light: string; running: number; shown: number },
  line: Words["line"],
): string {
  if (product.shown === 0) return line.none;
  if (product.light === "problem") return line.problem;
  if (product.light === "starting") return line.starting;
  if (product.running === product.shown) return line.running;
  if (product.running === 0) return line.stopped;
  return line.some(product.running, product.shown);
}
