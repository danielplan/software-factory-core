// The connected board, worked on this computer: its cards read every minute
// (and when asked) and shown on the Board tab. While the coach or the
// builder is on, each reading also applies the rules (decide.ts): cards
// merged or closed go to Done, a card in Ready without an agreed plan goes
// back to Planning, and each lane (the coach's, the builder's) starts its
// next job when it is free. A finished job reads the board again.

import type { BuilderView, CardView, Stage, WorkView } from "../api.ts";
import type { Card, Cards } from "../cards/cards.ts";
import { type BoardCard, decide, type Job, type Lane } from "./decide.ts";
import type { Jobs } from "./jobs.ts";
import { markComment } from "./protocol.ts";
import type { PullRequests } from "./pull-requests.ts";
import { snapshotOf } from "./snapshot.ts";

export const EVERY_MS = 60_000;

export type BoardWorkOptions = {
  cards: Cards;
  pullRequests: PullRequests;
  jobs: Jobs;
  onChange: () => void;
  everyMs?: number;
  now?: () => Date;
};

type Running = { job: Job; title: string; steps: string[] };
const STEPS = 40;
const WHAT: Record<Job["kind"], string> = {
  plan: "planning",
  build: "building",
  feedback: "answering the review of",
};

export class BoardWork {
  private readonly options: BoardWorkOptions;
  private cards: CardView[] = [];
  // The pull requests the builder opened, by card, from the last reading.
  private pullRequests = new Map<number, string>();
  private problem: string | null = null;
  private laneProblem: string | null = null;
  private read: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private reading: Promise<void> | null = null;
  private again = false;
  private readonly on: Record<Lane, boolean> = { chat: false, build: false };
  private readonly running = new Map<Lane, Running>();

  constructor(options: BoardWorkOptions) {
    this.options = options;
  }

  view(): WorkView {
    const building = this.running.get("build");
    const builder: BuilderView = {
      on: this.on.build,
      working: building
        ? {
            number: building.job.number,
            title: building.title,
            what: WHAT[building.job.kind],
          }
        : null,
      activity: building?.steps.at(-1) ?? null,
      steps: building?.steps ?? [],
      problem: this.laneProblem,
    };
    return {
      cards: this.cards,
      problem: this.problem,
      read: this.read,
      builder,
      coach: {
        on: this.on.chat,
        working: this.running.get("chat")?.job.number ?? null,
        steps: this.running.get("chat")?.steps ?? [],
      },
    };
  }

  // The coach (chat) or the builder (build) on or off; off finishes the job
  // it is on and takes no more.
  switch(lane: Lane, on: boolean): void {
    this.on[lane] = on;
    if (on) this.laneProblem = null;
    this.options.onChange();
    if (on) void this.refresh();
  }

  // Reads the board now, then every minute.
  start(): void {
    this.stop();
    void this.refresh();
    this.timer = setInterval(() => {
      void this.refresh();
    }, this.options.everyMs ?? EVERY_MS);
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

  private show(listed: Card[]): void {
    this.cards = listed.map(({ number, title, stage, column, url }) => ({
      number,
      title,
      stage,
      column,
      url,
      pullRequest: this.pullRequests.get(number) ?? null,
    }));
    this.problem = null;
    this.read = (this.options.now?.() ?? new Date()).toISOString();
    this.options.onChange();
  }

  private async work(listed: Card[]): Promise<void> {
    const { cards, pullRequests } = this.options;
    const board = await snapshotOf(listed, cards, pullRequests);
    this.notePullRequests(board);
    const busy = new Set([...this.running.values()].map((r) => r.job.number));
    const decision = decide(board, busy);
    for (const move of decision.moves)
      if (move.stage === "done" || this.on.build) await this.move(move);
    if (this.on.build)
      for (const c of decision.comments)
        await cards.comment(c.number, markComment(c.body, c.note));
    for (const lane of ["chat", "build"] as const) {
      const next = decision.jobs.find((j) => j.lane === lane);
      const card = board.find((c) => c.number === next?.number);
      if (next && card && this.on[lane] && !this.running.has(lane))
        this.begin(next, card);
    }
  }

  // The pull requests the cards have, shown on them from now on.
  private notePullRequests(board: BoardCard[]): void {
    for (const card of board)
      if (card.pullRequest)
        this.pullRequests.set(card.number, card.pullRequest.url);
    this.cards = this.cards.map((c) => ({
      ...c,
      pullRequest: this.pullRequests.get(c.number) ?? null,
    }));
  }

  private async move(move: { number: number; stage: Stage }) {
    await this.options.cards.move(move.number, move.stage);
  }

  private begin(job: Job, card: BoardCard): void {
    const running: Running = { job, title: card.title, steps: [] };
    this.running.set(job.lane, running);
    this.options.onChange();
    void this.options.jobs
      .run(job, card, (line) => {
        running.steps = [...running.steps, line].slice(-STEPS);
        this.options.onChange();
      })
      .catch((error: unknown) => {
        this.laneProblem = `#${String(job.number)}: ${messageOf(error)}`;
      })
      .finally(() => {
        this.running.delete(job.lane);
        this.options.onChange();
        void this.refresh();
      });
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
