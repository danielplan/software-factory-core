// The connected board, worked on this computer: its cards read every minute
// (and when asked) and shown on the Board tab. While the coach or the
// builder is on, each reading also applies the rules (decide.ts): cards
// merged or closed go to Done, a card in Ready without an agreed plan goes
// back to Planning, and each lane (the coach's, the builder's) starts its
// next job when it is free. A finished job reads the board again. A card
// Kobble waits for "did it work?" about is shown asking it, in Done, until
// a person answers. The cards the builder got stuck on are shown apart
// (Stuck); the owner's hint on one hands it back to the builder (To do).

import { labelledStage } from "@software-factory/core";

import type {
  Asking,
  BuilderView,
  CardView,
  Stage,
  StuckView,
  WorkView,
} from "../../../api.ts";
import {
  type Card,
  type Cards,
  isStuck,
  typeOf,
} from "../../../cards/cards.ts";
import {
  asksIfItWorked,
  type BoardCard,
  decide,
  type Decision,
  handedBack,
  type Job,
  type Lane,
  stuckCards,
  waitsForOwner,
} from "./decide.ts";
import type { Jobs } from "./jobs.ts";
import { markComment } from "./protocol.ts";
import type { PullRequests } from "./pull-requests.ts";
import { snapshotOf } from "./snapshot.ts";
import { clockOf } from "./usage-limit.ts";
import { SeenPullRequests } from "./seen-pull-requests.ts";

export const EVERY_MS = 60_000;

export type BoardWorkOptions = {
  cards: Cards;
  pullRequests: PullRequests;
  jobs: Jobs;
  onChange: () => void;
  everyMs?: number;
  now?: () => Date;
  // The issues Kobble waits for "did it work?" about; none without records.
  waiting?: () => ReadonlySet<number>;
  // Cards each lane works on at once (the Builder setting); 1 when not given.
  places?: () => number;
  // The builder on from the start (the factory's own board work); off
  // when not given, until it is switched on.
  building?: boolean;
};

// A job on a card, at its lane's place (its working copy).
type Running = { job: Job; title: string; steps: string[]; place: number };
const STEPS = 40;
const WHAT: Record<Job["kind"], string> = {
  build: "building",
  feedback: "answering the review of",
};

export class BoardWork {
  private readonly options: BoardWorkOptions;
  private cards: CardView[] = [];
  // The pull requests the builder opened, by card, from the last reading.
  private seen = new SeenPullRequests();
  // The cards that ask "did it work?": closed or in Done at the last
  // reading, and finished by the rules' last decision (a merged pull
  // request may leave its card open).
  private asked = new Set<number>();
  private decided = new Set<number>();
  private asking: Asking[] = [];
  private stuck: StuckView[] = [];
  // The cards in To do handed back with the owner's hint.
  private hinted = new Set<number>();
  private problem: string | null = null;
  private laneProblem: string | null = null;
  private read: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private reading: Promise<void> | null = null;
  private again = false;
  private readonly on: Record<Lane, boolean>;
  // The jobs under way, by card.
  private readonly running = new Map<number, Running>();
  // Claude's usage limit: no new job starts before then.
  private pausedUntil: Date | null = null;

  constructor(options: BoardWorkOptions) {
    this.options = options;
    this.on = { chat: false, build: options.building === true };
  }

  view(): WorkView {
    const [building, ...alsoBuilding] = this.inLane("build");
    const planning = this.inLane("chat");
    const builder: BuilderView = {
      on: this.on.build,
      working: building ? workingOf(building) : null,
      also: alsoBuilding.map(workingOf),
      activity: building?.steps.at(-1) ?? null,
      steps: building?.steps ?? [],
      problem: this.laneProblem ?? this.pauseWords(),
    };
    const waiting = this.waiting();
    return {
      cards: this.cards.map((card) => ({
        ...card,
        asks:
          (this.asked.has(card.number) || this.decided.has(card.number)) &&
          waiting.has(card.number),
        hint: this.hinted.has(card.number),
      })),
      problem: this.problem,
      read: this.read,
      asking: this.asking,
      stuck: this.stuck,
      builder,
      coach: {
        on: this.on.chat,
        working: planning[0]?.job.number ?? null,
        also: planning.slice(1).map((one) => one.job.number),
        steps: planning[0]?.steps ?? [],
      },
    };
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private paused(): boolean {
    return (
      this.pausedUntil !== null &&
      this.pausedUntil.getTime() > this.now().getTime()
    );
  }

  private pauseWords(): string | null {
    if (!this.paused() || !this.pausedUntil) return null;
    return `Paused until ${clockOf(this.pausedUntil)}: Claude's usage limit is reached.`;
  }

  // A lane's jobs, by place.
  private inLane(lane: Lane): Running[] {
    return [...this.running.values()]
      .filter((one) => one.job.lane === lane)
      .sort((a, b) => a.place - b.place);
  }

  // The lane's first free place, none when all its places are taken.
  private freePlace(lane: Lane): number | null {
    const places = Math.max(1, this.options.places?.() ?? 1);
    const taken = new Set(this.inLane(lane).map((one) => one.place));
    for (let place = 1; place <= places; place++)
      if (!taken.has(place)) return place;
    return null;
  }

  // The owner's answer to a card the factory waits on, from the Factory
  // page: a comment on the card, as if written on GitHub. A stuck card is
  // handed back to the builder with it: moved to To do.
  async answer(number: number, text: string): Promise<void> {
    await this.options.cards.comment(number, text);
    if (this.stuck.some((one) => one.number === number))
      await this.options.cards.move(number, "todo");
    this.asking = this.asking.filter((one) => one.number !== number);
    this.stuck = this.stuck.filter((one) => one.number !== number);
    this.options.onChange();
    void this.refresh();
  }

  // The coach (chat) or the builder (build) on or off; off finishes the job
  // it is on and takes no more.
  switch(lane: Lane, on: boolean): void {
    this.on[lane] = on;
    if (on) this.laneProblem = null;
    this.options.onChange();
    if (on) void this.refresh();
  }

  // Reads the board now, then every minute (or as often as asked).
  start(): void {
    this.stop();
    void this.refresh();
    this.every(this.options.everyMs ?? EVERY_MS);
  }

  // How often the board is read from now on: less often while GitHub's
  // signals come as they happen.
  every(ms: number): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      void this.refresh();
    }, ms);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // One reading at a time; asked again while reading, it reads once more.
  async refresh(): Promise<void> {
    if (this.reading) {
      this.again = true;
      await this.reading;
      return;
    }
    this.reading = this.readAndWork().finally(() => {
      this.reading = null;
    });
    await this.reading;
    if (this.again) {
      this.again = false;
      await this.refresh();
    }
  }

  private async readAndWork(): Promise<void> {
    try {
      const listed = await this.options.cards.list();
      this.show(listed);
      if (this.on.chat || this.on.build) await this.work(listed);
    } catch (error) {
      this.problem = messageOf(error);
      this.options.onChange();
    }
  }

  private waiting(): ReadonlySet<number> {
    return this.options.waiting?.() ?? new Set();
  }

  private show(listed: Card[]): void {
    const waiting = this.waiting();
    this.asked = new Set(
      listed
        .filter((card) =>
          asksIfItWorked({
            ...card,
            pullRequest: null,
            awaitsAnswer: waiting.has(card.number),
          }),
        )
        .map((card) => card.number),
    );
    this.cards = listed.map(
      ({ number, title, stage, column, url, closed, labels }) => ({
        number,
        title,
        stage,
        column,
        url,
        ...this.seen.of(number),
        closed,
        asks: false,
        type: typeOf(labels),
        stuck: isStuck(labels),
        held: labelledStage(labels),
      }),
    );
    this.problem = null;
    this.read = (this.options.now?.() ?? new Date()).toISOString();
    this.options.onChange();
  }

  private async work(listed: Card[]): Promise<void> {
    const { cards, pullRequests } = this.options;
    const board = await snapshotOf(listed, cards, pullRequests, this.waiting());
    this.notePullRequests(board);
    this.asking = board.flatMap((card) => {
      const waits = waitsForOwner(card);
      return waits
        ? [{ number: card.number, title: card.title, url: card.url, ...waits }]
        : [];
    });
    this.stuck = stuckCards(board);
    this.hinted = new Set(board.filter(handedBack).map((card) => card.number));
    const busy = new Set(this.running.keys());
    const decision = decide(board, busy, this.now());
    this.decided = new Set(decision.asks);
    await this.apply(decision);
    for (const next of this.paused() ? [] : decision.jobs) {
      const card = board.find((c) => c.number === next.number);
      const place = this.on[next.lane] ? this.freePlace(next.lane) : null;
      if (card && place !== null && !this.running.has(next.number))
        this.begin(next, card, place);
    }
  }

  // The rules' moves (to Done always; the rest while the builder is on),
  // stuck marks and comments.
  private async apply(decision: Decision): Promise<void> {
    const { cards } = this.options;
    if (this.on.build)
      for (const number of decision.stuck)
        await cards.markStuck?.(number, true);
    for (const move of decision.moves)
      if (move.stage === "done" || this.on.build) await this.move(move);
    if (this.on.build)
      for (const c of decision.comments)
        await cards.comment(c.number, markComment(c.body, c.note));
  }

  // The pull requests the cards have, shown on them from now on.
  private notePullRequests(board: BoardCard[]): void {
    this.seen.note(board);
    this.cards = this.cards.map((c) => ({ ...c, ...this.seen.of(c.number) }));
  }

  private async move(move: { number: number; stage: Stage }) {
    await this.options.cards.move(move.number, move.stage);
  }

  private begin(job: Job, card: BoardCard, place: number): void {
    const running: Running = { job, title: card.title, steps: [], place };
    this.running.set(job.number, running);
    this.options.onChange();
    void this.options.jobs
      .run(
        job,
        card,
        (line) => {
          running.steps = [...running.steps, line].slice(-STEPS);
          this.options.onChange();
        },
        place,
      )
      .then(({ pausedUntil }) => {
        if (pausedUntil) this.pausedUntil = pausedUntil;
      })
      .catch((error: unknown) => {
        this.laneProblem = `#${String(job.number)}: ${messageOf(error)}`;
      })
      .finally(() => {
        this.running.delete(job.number);
        this.options.onChange();
        void this.refresh();
      });
  }
}

function workingOf(one: Running) {
  return {
    number: one.job.number,
    title: one.title,
    what: WHAT[one.job.kind],
    activity: one.steps.at(-1) ?? null,
    steps: [...one.steps],
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
