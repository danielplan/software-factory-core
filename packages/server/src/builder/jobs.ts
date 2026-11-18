// The jobs on a card: the coach plans it (read-only copy of main), the
// builder builds it or answers its review comments (the card's branch in a
// copy of its own). After a build the factory runs the checks itself, gives
// the builder up to three rounds to fix what is red, pushes, and opens the
// pull request once every check passes. When it gives up, what it did goes
// up as a draft pull request that says what is wrong, and the card waits in
// In progress.

import { type Available, type Claude } from "@software-factory/core";

import type { Cards } from "../cards/cards.ts";
import { copyName, headOf } from "./branches.ts";
import {
  changedFiles,
  checkWithFixes,
  failedChecksSection,
  FIX_ROUNDS,
  type Shell,
} from "./checks.ts";
import type { BoardCard, Job } from "./decide.ts";
import {
  buildPrompt,
  feedbackPrompt,
  fixChecksPrompt,
  planPrompt,
} from "./prompts.ts";
import {
  markComment,
  type Note,
  pausedComment,
  readNote,
  readStatusLine,
} from "./protocol.ts";
import { openOrUpdate, type PullRequests } from "./pull-requests.ts";
import { runSessions } from "./sessions.ts";
import { type BuildCopy, builderTurn, coachTurn } from "./turn.ts";
import { Paused, pausedText } from "./usage-limit.ts";

export type ReadCopy = { path: string; prepareReadOnly: () => Promise<void> };
export type { BuildCopy } from "./turn.ts";
export { copyName } from "./branches.ts";

export type JobsOptions = {
  cards: Cards;
  pullRequests: PullRequests;
  claude: Claude;
  repository: string;
  available: Available;
  // The working copies of each lane; place 1 is "chat" and "build", the
  // others "chat-2", "build-2" … (cards at once, each in a copy of its own).
  copies: {
    chat: (place: number) => Promise<ReadCopy>;
    build: (place: number) => Promise<BuildCopy>;
  };
  shell?: Shell;
  timeLimitMs?: number;
  // The builder's model, read for each job; none: the factory's own.
  model?: () => string | undefined;
  now?: () => Date;
};

// Where one job works: its lane's copy, and how many cards there are at once.
type Place = {
  chat: () => Promise<ReadCopy>;
  build: () => Promise<BuildCopy>;
  name: string;
};

const BUILD_TIME_MS = 3 * 60 * 60_000;
const PLAN_NOTES: readonly Note[] = ["question", "plan-agreed", "blocked"];

export class Jobs {
  private readonly options: JobsOptions;

  constructor(options: JobsOptions) {
    this.options = options;
  }

  // The job on the card; when Claude's usage limit stops it, the card says
  // so and the time it may go on is given back.
  async run(
    job: Job,
    card: BoardCard,
    onActivity: (line: string) => void,
    place = 1,
  ): Promise<{ pausedUntil: Date | null }> {
    const at: Place = {
      chat: () => this.options.copies.chat(place),
      build: () => this.options.copies.build(place),
      name: copyName(job.lane, place),
    };
    try {
      if (job.kind === "plan") await this.plan(card, at, onActivity);
      else if (job.kind === "build") await this.build(card, at, onActivity);
      else await this.feedback(card, at, onActivity);
    } catch (error) {
      if (!(error instanceof Paused)) throw error;
      await this.options.cards.comment(
        card.number,
        pausedComment(pausedText(error.until), error.until),
      );
      return { pausedUntil: error.until };
    }
    return { pausedUntil: null };
  }

  private now(): Date {
    return this.options.now?.() ?? new Date();
  }

  private async plan(
    card: BoardCard,
    at: Place,
    onActivity: (line: string) => void,
  ) {
    const { cards } = this.options;
    const result = await coachTurn({
      claude: this.options.claude,
      copy: await at.chat(),
      prompt: planPrompt(card),
      onActivity,
      now: this.now(),
    });
    if (!result.ok) {
      await this.say(
        card.number,
        `The coach could not answer: ${result.error ?? "it stopped"}. Write a comment to let it try again.`,
        "failed",
      );
      return;
    }
    const { text, status } = readStatusLine(result.text);
    const note = PLAN_NOTES.find((n) => n === status) ?? "question";
    if (note === "plan-agreed") await cards.writePlan(card.number, text);
    await this.say(card.number, text, note);
  }

  private async build(
    card: BoardCard,
    at: Place,
    onActivity: (line: string) => void,
  ) {
    const { cards } = this.options;
    const continued =
      card.stage === "doing" ||
      card.thread.some((m) => readNote(m.body) === "started");
    if (card.stage !== "doing") {
      await cards.move(card.number, "doing");
      await this.say(
        card.number,
        "The builder started on this card.",
        "started",
      );
    }
    const { answer, gaveUp } = await runSessions(continued, {
      session: (earlier) =>
        this.agent(card, at, buildPrompt(card, earlier, at.name), onActivity),
      head: async () => headOf((await at.build()).path),
      progress: (n, text) =>
        this.say(
          card.number,
          `Session ${String(n)} done:\n\n${text}`,
          "progress",
        ),
    });
    if (gaveUp !== null) {
      await this.giveUp(card, at, gaveUp, "failed", null);
      return;
    }
    if (answer.status === "blocked") {
      await this.say(card.number, answer.text, "blocked");
      await cards.move(card.number, "planning");
      return;
    }
    if (answer.status !== "done") {
      await this.giveUp(card, at, answer.text, "failed", null);
      return;
    }
    await this.checkedPullRequest(card, at, answer.text, onActivity);
  }

  // A build the builder calls done: the checks, then the pull request.
  private async checkedPullRequest(
    card: BoardCard,
    at: Place,
    text: string,
    onActivity: (line: string) => void,
  ) {
    const { cards } = this.options;
    const checked = await this.checkAndPush(card, at, onActivity);
    if (checked.blocked !== null) {
      await this.say(card.number, checked.blocked, "blocked");
      await cards.move(card.number, "planning");
      return;
    }
    if (!checked.passed) {
      await this.giveUp(
        card,
        at,
        `${text}\n\nThe work is built, but the checks still fail after ${String(FIX_ROUNDS)} rounds of fixing.`,
        "checks-failed",
        checked.report,
      );
      return;
    }
    const url = await this.pullRequest(card, text, false);
    await this.say(
      card.number,
      `Built, and every check passes: ${url} is ready for your review.`,
      "review-ready",
    );
    await cards.move(card.number, "review");
  }

  // The builder gave up: what it did so far goes up as a draft pull request
  // that says what is wrong (none when it changed nothing), and the card
  // waits in In progress for the owner's comment.
  private async giveUp(
    card: BoardCard,
    at: Place,
    text: string,
    note: Note,
    report: string | null,
  ) {
    const copy = await at.build();
    const base = await this.options.pullRequests.baseBranch();
    const changed = (await changedFiles(copy.path, base)).length > 0;
    const failed = report === null ? "" : `\n\n${failedChecksSection(report)}`;
    const url = changed
      ? await this.pullRequest(card, `${text}${failed}`, true)
      : null;
    const draft = url
      ? `What it did so far is in a draft pull request, not to merge yet: ${url}`
      : "It changed nothing yet.";
    await this.say(
      card.number,
      `${text}\n\n${draft}\n\nThe card stays in **In progress**: write a comment here to let the builder try again, with any hint you have.`,
      note,
    );
  }

  private async feedback(
    card: BoardCard,
    at: Place,
    onActivity: (line: string) => void,
  ) {
    const pr = card.pullRequest;
    if (!pr) return;
    const answer = await this.agent(
      card,
      at,
      feedbackPrompt(card, at.name),
      onActivity,
    );
    const note: Note = answer.status === "done" ? "fixed" : "blocked";
    if (note === "fixed") {
      const checked = await this.checkAndPush(card, at, onActivity);
      if (checked.blocked !== null) {
        await this.sayOnPullRequest(pr.number, checked.blocked, "blocked");
        return;
      }
      if (!checked.passed) {
        await this.options.pullRequests.update(
          pr.number,
          `${answer.text}\n\n${failedChecksSection(checked.report)}`,
          true,
        );
        await this.sayOnPullRequest(
          pr.number,
          `${answer.text}\n\nThe checks still fail after ${String(FIX_ROUNDS)} rounds of fixing, so this is a draft until they pass:\n\n${checked.report}`,
          "checks-failed",
        );
        return;
      }
      if (pr.draft)
        await this.options.pullRequests.update(
          pr.number,
          `${answer.text}\n\nCloses #${String(card.number)}.`,
          false,
        );
    }
    await this.sayOnPullRequest(pr.number, answer.text, note);
  }

  // The builder's turn on the card's branch (turn.ts).
  private async agent(
    card: BoardCard,
    at: Place,
    prompt: string,
    onActivity: (line: string) => void,
  ) {
    return await builderTurn({
      claude: this.options.claude,
      copy: await at.build(),
      card,
      prompt,
      onActivity,
      model: this.options.model?.(),
      timeLimitMs: this.options.timeLimitMs ?? BUILD_TIME_MS,
      repository: this.options.repository,
      now: this.now(),
    });
  }

  // The checks, with rounds of fixing while any is red (checks.ts).
  private async checkAndPush(
    card: BoardCard,
    at: Place,
    onActivity: (line: string) => void,
  ) {
    return await checkWithFixes({
      copy: (await at.build()).path,
      available: this.options.available,
      base: await this.options.pullRequests.baseBranch(),
      ...(this.options.shell ? { shell: this.options.shell } : {}),
      onActivity,
      fix: (report, round) =>
        this.agent(
          card,
          at,
          fixChecksPrompt(card, report, round, FIX_ROUNDS),
          onActivity,
        ),
    });
  }

  // Opens the card's pull request, or updates the one there is; its address.
  private async pullRequest(card: BoardCard, text: string, draft: boolean) {
    return await openOrUpdate(this.options.pullRequests, card, text, draft);
  }

  private async say(number: number, text: string, note: Note) {
    await this.options.cards.comment(number, markComment(text, note));
  }

  private async sayOnPullRequest(number: number, text: string, note: Note) {
    await this.options.pullRequests.comment(number, markComment(text, note));
  }
}
