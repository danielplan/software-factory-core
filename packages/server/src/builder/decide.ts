// The board's rules: given the board, what happens next. Pure on purpose,
// so every rule has a test (test/board-rules.test.ts). The card's thread is
// the memory: the factory's notes in it (protocol.ts) say how far each card
// is. A card Kobble knows (an idea's version sent to Build) is never
// finished silently: once it is closed or merged, or moved to Done, it waits
// there for a person to say whether it worked.

import type { Stage } from "../api.ts";
import {
  AGREEMENT_NOTES,
  CONVERSATION_NOTES,
  type Ask,
  NOTES,
  type Note,
  readAsk,
  readNote,
  stripMarker,
  untilOf,
} from "./protocol.ts";

export type Message = {
  author: string;
  body: string;
  at: string;
  where: "card" | "pull request";
};

export type BoardCard = {
  number: number;
  title: string;
  url: string;
  body: string;
  stage: Stage | null;
  closed: boolean;
  // The agreed plan is in the card's text (software-factory card agree).
  agreedInText: boolean;
  // The open cards it depends on: it is not built before they are done.
  waitsFor: number[];
  thread: Message[];
  pullRequest: {
    number: number;
    url: string;
    state: "OPEN" | "MERGED" | "CLOSED";
    draft: boolean;
    thread: Message[];
  } | null;
  // Kobble knows its issue as an idea's version, and nobody has said yet
  // whether it worked.
  awaitsAnswer: boolean;
};

// The coach answers in the cards (chat); the builder builds (build).
export type Lane = "chat" | "build";
export type JobKind = "plan" | "build" | "feedback";
export type Job = { lane: Lane; kind: JobKind; number: number };

export type Decision = {
  moves: { number: number; stage: Stage }[];
  comments: { number: number; note: Note; body: string }[];
  jobs: Job[];
  // The cards that wait in Done for "did it work?".
  asks: number[];
};

type Found = Decision & { order: Record<JobKind | "resumed", Job[]> };

// Jobs in the order they start: in the build lane, review comments first,
// then interrupted builds, then new ones; within each, the board's order.
export function decide(
  cards: BoardCard[],
  running: ReadonlySet<number>,
  now: Date = new Date(),
): Decision {
  const found: Found = {
    moves: [],
    comments: [],
    jobs: [],
    asks: [],
    order: { feedback: [], resumed: [], build: [], plan: [] },
  };
  for (const card of cards) look(card, running, found, now);
  const { feedback, resumed, build, plan } = found.order;
  return {
    moves: found.moves,
    comments: found.comments,
    jobs: [...feedback, ...resumed, ...build, ...plan],
    asks: found.asks,
  };
}

// Closed where it is tracked, or its pull request merged.
function isFinished(card: Pick<BoardCard, "closed" | "pullRequest">): boolean {
  return card.closed || card.pullRequest?.state === "MERGED";
}

// A card Kobble waits for an answer about, once it is finished or in Done:
// it stays in Done with "did it work?" until a person answers.
export function asksIfItWorked(
  card: Pick<BoardCard, "closed" | "pullRequest" | "stage" | "awaitsAnswer">,
): boolean {
  return card.awaitsAnswer && (isFinished(card) || card.stage === "done");
}

function look(
  card: BoardCard,
  running: ReadonlySet<number>,
  found: Found,
  now: Date,
) {
  if (asksIfItWorked(card)) found.asks.push(card.number);
  if (isFinished(card)) {
    if (card.stage !== "done")
      found.moves.push({ number: card.number, stage: "done" });
    return;
  }
  if (card.stage === null) {
    found.moves.push({ number: card.number, stage: "backlog" });
    return;
  }
  if (running.has(card.number) || pausedAt(card, now)) return;
  lookInStage(card, found);
}

// Paused by Claude's usage limit: the card waits until it resets, unless
// the owner wrote since.
function pausedAt(card: BoardCard, now: Date): boolean {
  const last = card.thread.findLast((m) => readNote(m.body) === "paused");
  if (!last || ownerSpokeAfter(card.thread, ["paused"])) return false;
  const until = untilOf(last.body);
  const later = card.thread.slice(card.thread.indexOf(last) + 1);
  const resumed = later.some((m) => readNote(m.body) !== null);
  return !resumed && until !== null && until.getTime() > now.getTime();
}

// Every note but a pause, which only says the factory waits.
const REVIEW_NOTES: readonly Note[] = NOTES.filter((n) => n !== "paused");

function lookInStage(card: BoardCard, found: Found): void {
  const { number } = card;
  const { order } = found;
  switch (card.stage) {
    case "planning":
      if (
        !lastNote(card.thread, CONVERSATION_NOTES) ||
        ownerSpokeAfter(card.thread, CONVERSATION_NOTES)
      )
        order.plan.push({ lane: "chat", kind: "plan", number });
      break;
    case "todo": {
      // It waits in Ready until the cards it depends on are done.
      if (card.waitsFor.length > 0) break;
      const why = notReady(card);
      if (why === null)
        order.build.push({ lane: "build", kind: "build", number });
      else {
        found.moves.push({ number, stage: "planning" });
        found.comments.push({
          number,
          note: "moved-back",
          body: `The builder moved this card back to **Planning** because ${why}. Once the plan is agreed, move it to **Ready** again.`,
        });
      }
      break;
    }
    case "doing":
      if (!waitingAfterFailedChecks(card.thread))
        order.resumed.push({ lane: "build", kind: "build", number });
      break;
    case "review":
      if (
        card.pullRequest &&
        ownerSpokeAfter(reviewTimeline(card), REVIEW_NOTES)
      )
        order.feedback.push({ lane: "build", kind: "feedback", number });
      break;
    default:
      break;
  }
}

// Feedback comes on the card, on the pull request, or on its lines.
export function reviewTimeline(card: BoardCard): Message[] {
  return [...card.thread, ...(card.pullRequest?.thread ?? [])].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
}

// Why a card in Ready cannot be built yet; none when it can. A plan is
// agreed in the card's text or in the factory's note; a comment after the
// agreed plan, or an open question, sends it back. A question the builder
// asked is answered by the owner's comment.
function notReady(card: BoardCard): string | null {
  const { thread } = card;
  const hasPlan =
    card.agreedInText || thread.some((m) => readNote(m.body) === "plan-agreed");
  if (!hasPlan) return "the plan is not agreed yet";
  const last = lastNote(thread, AGREEMENT_NOTES);
  if (last === "question") return "a question about the plan is still open";
  if (last === "plan-agreed" && ownerSpokeAfter(thread, AGREEMENT_NOTES))
    return "there is a new comment after the agreed plan";
  if (last === "blocked" && !ownerSpokeAfter(thread, ["blocked"]))
    return "the builder's question is not answered yet";
  return null;
}

// The owner wrote after the factory's last note of these kinds (or wrote
// anything, when there is none yet).
function ownerSpokeAfter(thread: Message[], kinds: readonly Note[]): boolean {
  const last = thread.findLastIndex((m) => {
    const note = readNote(m.body);
    return note !== null && kinds.includes(note);
  });
  return thread.slice(last + 1).some((m) => readNote(m.body) === null);
}

function lastNote(thread: Message[], kinds: readonly Note[]): Note | null {
  for (const message of thread.toReversed()) {
    const note = readNote(message.body);
    if (note && kinds.includes(note)) return note;
  }
  return null;
}

// The builder gave up (the checks still red after its rounds of fixing, or
// it could not finish): the build waits for the owner's comment.
function waitingAfterFailedChecks(thread: Message[]): boolean {
  const gaveUp: readonly Note[] = ["checks-failed", "failed"];
  return (
    thread.some((m) => gaveUp.includes(readNote(m.body) ?? "started")) &&
    !ownerSpokeAfter(thread, gaveUp)
  );
}

// The factory waits for the owner on this card: its last word is a
// question (planning) or a stop that only the owner can unblock, and the
// owner has not answered yet. The question as the Factory page shows it.
export function waitsForOwner(
  card: Pick<BoardCard, "thread" | "closed">,
): { text: string; ask: Ask | null } | null {
  if (card.closed) return null;
  const asking: readonly Note[] = ["question", "blocked"];
  const last = card.thread.findLast((m) => readNote(m.body) !== null);
  if (!last || !asking.includes(readNote(last.body) ?? "started")) return null;
  if (ownerSpokeAfter(card.thread, NOTES)) return null;
  return { text: stripMarker(last.body), ask: readAsk(last.body) };
}
