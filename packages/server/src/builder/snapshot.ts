// The board as the rules need it (decide.ts): every card that is not done,
// with its text and its thread, and its pull request where the builder
// opened one. Cards that are done, or in the backlog, need no more reading,
// but for the stuck ones there (what the builder said shows on them).
// Which issues Kobble waits for "did it work?" about comes from the records.

import { type Card, type Cards, isStuck } from "../cards/cards.ts";
import { branchOf } from "./branches.ts";
import type { BoardCard } from "./decide.ts";
import type { PullRequests } from "./pull-requests.ts";

const READ: readonly (string | null)[] = [
  "planning",
  "todo",
  "doing",
  "review",
];

export async function snapshotOf(
  listed: Card[],
  cards: Cards,
  pullRequests: PullRequests,
  waiting: ReadonlySet<number>,
): Promise<BoardCard[]> {
  const read: BoardCard[] = [];
  for (const card of listed)
    read.push(await boardCard(card, cards, pullRequests, waiting));
  return read;
}

async function boardCard(
  card: Card,
  cards: Cards,
  pullRequests: PullRequests,
  waiting: ReadonlySet<number>,
): Promise<BoardCard> {
  const plain: BoardCard = {
    number: card.number,
    title: card.title,
    url: card.url,
    body: "",
    stage: card.stage,
    closed: card.closed,
    agreedInText: false,
    waitsFor: card.waitsFor,
    thread: [],
    pullRequest: null,
    awaitsAnswer: waiting.has(card.number),
    stuck: isStuck(card.labels),
  };
  const read =
    READ.includes(card.stage) || (plain.stuck && card.stage === "backlog");
  if (card.closed || !read) return plain;
  const detail = await cards.show(card.number);
  const found =
    card.stage === "doing" || card.stage === "review"
      ? await pullRequests.find(branchOf(card.number))
      : null;
  return {
    ...plain,
    body: detail.body,
    agreedInText: detail.agreed,
    thread: detail.comments.map((c) => ({ ...c, where: "card" })),
    pullRequest: found && {
      ...found,
      thread:
        found.state === "OPEN" ? await pullRequests.said(found.number) : [],
    },
  };
}
