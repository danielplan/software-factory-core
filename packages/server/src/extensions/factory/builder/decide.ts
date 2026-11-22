// The board's rules: given the board, what happens next. Pure on purpose,
// so every rule has a test (test/board-rules.test.ts). The card's thread is
// the memory: the factory's notes in it (protocol.ts) say how far each card
// is. A card Kobble knows (an idea's version sent to Build) is never
// finished silently: once it is closed or merged, or moved to Done, it waits
// there for a person to say whether it worked.
//
// The builder keeps to its own cards: a card in In progress is its own only
// when its start is the factory's last word on it; a person who moves a card
// there works on it by hand. A card it got stuck on (a question, a failure,
// checks still red) goes to Backlog marked stuck (a label), where the owner
// sees it apart from the new ideas; moving it to To do hands it back.

import type { Stage, StuckView } from "../../../api.ts";
import type { Message } from "../../../code-host.ts";
import {
  AGREEMENT_NOTES,
  type Ask,
  NOTES,
  type Note,
  readAsk,
  readNote,
  stripMarker,
  untilOf,
} from "./protocol.ts";

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
    conflicting?: boolean;
    thread: Message[];
  } | null;
  // Kobble knows its issue as an idea's version, and nobody has said yet
  // whether it worked.
  awaitsAnswer: boolean;
  // The builder got stuck on it (the stuck label where it is tracked).
  stuck: boolean;
};

// The coach answers in the cards (chat); the builder builds (build).
export type Lane = "chat" | "build";
export type JobKind = "build" | "feedback";
export type Job = { lane: Lane; kind: JobKind; number: number };

export type Decision = {
  moves: { number: number; stage: Stage }[];
  comments: { number: number; note: Note; body: string }[];
  jobs: Job[];
  // The cards that wait in Done for "did it work?".
  asks: number[];
  // The cards to mark stuck (an older builder left them waiting in To do or
  // In progress); each also moves to Backlog.
  stuck: number[];
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
    stuck: [],
    order: { feedback: [], resumed: [], build: [] },
  };
  for (const card of cards) look(card, running, found, now);
  const { feedback, resumed, build } = found.order;
  return {
    moves: found.moves,
    comments: found.comments,
    jobs: [...feedback, ...resumed, ...build],
    asks: found.asks,
    stuck: found.stuck,
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
    case "todo":
      // It waits in To do until the cards it depends on are done. Moved
      // here, a stuck card is handed back to the builder.
      if (card.waitsFor.length > 0) break;
      if (!card.stuck && waitsForAnswer(card)) markStuck(card, found);
      else order.build.push({ lane: "build", kind: "build", number });
      break;
    case "doing":
      lookInProgress(card, found);
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

// In progress: the builder resumes its own interrupted build and leaves a
// person's card alone. A card an older builder gave up on there (it waited
// for the owner's comment) goes to Backlog as stuck, or to To do once the
// owner wrote.
function lookInProgress(card: BoardCard, found: Found): void {
  const last = lastNote(card.thread, OWNING_NOTES);
  if (last === "started") {
    found.order.resumed.push({
      lane: "build",
      kind: "build",
      number: card.number,
    });
    return;
  }
  if (card.stuck || last === null || !GAVE_UP.includes(last)) return;
  if (ownerSpokeAfter(card.thread, GAVE_UP))
    found.moves.push({ number: card.number, stage: "todo" });
  else markStuck(card, found);
}

function markStuck(card: BoardCard, found: Found): void {
  found.moves.push({ number: card.number, stage: "backlog" });
  found.stuck.push(card.number);
}

// The notes that say who has the card: every one but the reports.
const OWNING_NOTES: readonly Note[] = NOTES.filter(
  (n) => n !== "progress" && n !== "paused" && n !== "replied",
);

// The builder gave up: the checks still red after its rounds of fixing, or
// it could not finish, or it used its sessions and is not finished yet.
const GAVE_UP: readonly Note[] = ["checks-failed", "failed", "out-of-sessions"];

// A card handed back with the owner's hint: in To do, after the builder's
// question or giving up, with a comment from the owner since.
export function handedBack(
  card: Pick<BoardCard, "stage" | "closed" | "thread">,
): boolean {
  if (card.closed || card.stage !== "todo") return false;
  const last = lastNote(card.thread, OWNING_NOTES);
  const stopped: readonly Note[] = ["blocked", "question", ...GAVE_UP];
  return (
    last !== null &&
    stopped.includes(last) &&
    ownerSpokeAfter(card.thread, OWNING_NOTES)
  );
}

// Where a stuck card waits for the owner (Backlog), with the builder's last
// word on it: the question it asks, or why it gave up, and since when.
export function stuckOf(
  card: Pick<BoardCard, "stage" | "closed" | "stuck" | "thread">,
): { note: Note; text: string; ask: Ask | null; since: string } | null {
  if (!card.stuck || card.closed || card.stage !== "backlog") return null;
  const last = card.thread.findLast((m) => {
    const note = readNote(m.body);
    return note !== null && OWNING_NOTES.includes(note);
  });
  const note = last ? readNote(last.body) : null;
  if (!last || !note) return null;
  return {
    note,
    text: stripMarker(last.body),
    ask: readAsk(last.body),
    since: last.at,
  };
}

// Feedback comes on the card, on the pull request, or on its lines.
export function reviewTimeline(card: BoardCard): Message[] {
  return [...card.thread, ...(card.pullRequest?.thread ?? [])].sort((a, b) =>
    a.at.localeCompare(b.at),
  );
}

// A card in To do waits while the factory's last question on it (the
// builder's, or one from before) has no answer from the owner yet. Its text
// is the plan: it came agreed from an exploration, or from a signal.
function waitsForAnswer(card: BoardCard): boolean {
  const last = lastNote(card.thread, AGREEMENT_NOTES);
  return (
    (last === "question" || last === "blocked") &&
    !ownerSpokeAfter(card.thread, AGREEMENT_NOTES)
  );
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

// The factory waits for the owner on this card: its last word is a
// question (planning) or a stop that only the owner can unblock, and the
// owner has not answered yet. The question as the Factory page shows it.
export function waitsForOwner(
  card: Pick<BoardCard, "thread" | "closed"> & { stuck?: boolean },
): { text: string; ask: Ask | null } | null {
  // A stuck card asks in the Stuck list instead.
  if (card.closed || card.stuck) return null;
  const asking: readonly Note[] = ["question", "blocked"];
  const last = card.thread.findLast((m) => readNote(m.body) !== null);
  if (!last || !asking.includes(readNote(last.body) ?? "started")) return null;
  if (ownerSpokeAfter(card.thread, NOTES)) return null;
  return { text: stripMarker(last.body), ask: readAsk(last.body) };
}

// The stuck cards, oldest first, with the builder's last word on each.
export function stuckCards(board: BoardCard[]): StuckView[] {
  return board
    .flatMap((card) => {
      const said = stuckOf(card);
      return said
        ? [{ number: card.number, title: card.title, url: card.url, ...said }]
        : [];
    })
    .sort((a, b) => a.since.localeCompare(b.since));
}
