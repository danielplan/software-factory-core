// The jobs on a card: the coach plans it (read-only copy of main), the
// builder builds it or answers its review comments (the card's branch in a
// copy of its own). After a build the factory runs the checks itself, gives
// the builder up to three rounds to fix what is red, pushes, and opens the
// pull request once every check passes. When it gives up or asks, the card
// goes to Backlog marked stuck (what it did so far up as a draft pull request
// that says what is wrong), and waits for the owner to move it to To do.
// It never takes a card's branch from a copy that is not the factory's: a
// person works on that card by hand.

import { type Available, type Claude } from "@software-factory/core";

import type { Browser } from "../kobble/persona-tests.ts";
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
import type { ReadCopy } from "./reply.ts";
import { byHand } from "./by-hand.ts";
import { guidesFor, withGuides } from "./extension-guides.ts";
import { keepKnowledge } from "./knowledge-kept.ts";
import { buildPrompt, feedbackPrompt, fixChecksPrompt } from "./prompts.ts";
import { markComment, type Note, pausedComment, readNote } from "./protocol.ts";
import { openOrUpdate, type PullRequests } from "./pull-requests.ts";
import { replyTo } from "./reply.ts";
import { runSessions } from "./sessions.ts";
import { type BuildCopy, builderTurn } from "./turn.ts";
import { Paused, pausedText } from "./usage-limit.ts";

export type { ReadCopy } from "./reply.ts";
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
  // A browser of its own for each turn, headless and without a saved
  // profile (Playwright's), to look at what it built; without one it gets
  // none, never the person's own browser.
  browser?: () => Promise<Browser>;
  now?: () => Date;
};

// Where one job works: its lane's copy, and how many cards there are at once.
type Place = {
  chat: () => Promise<ReadCopy>;
  build: () => Promise<BuildCopy>;
  name: string;
};

const BUILD_TIME_MS = 3 * 60 * 60_000;

// How the owner lets the builder try again on a card it gave up on.
const HAND_BACK =
  "The card waits in **Backlog**, marked stuck: write a hint here (or on the Factory page) and move it to **To do** to let the builder try again.";

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
      if (job.kind === "build") await this.build(card, at, onActivity);
      else if (job.kind === "reply") {
        const said = await replyTo(card, at, this.options, onActivity);
        await this.say(card.number, said, "replied");
      } else await this.feedback(card, at, onActivity);
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

  private async build(
    card: BoardCard,
    at: Place,
    onActivity: (line: string) => void,
  ) {
    const { cards } = this.options;
    if (
      await byHand(card, at, this.options.cards, (text) =>
        this.say(card.number, text, "by-hand"),
      )
    )
      return;
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
      if (card.stuck) await cards.markStuck?.(card.number, false);
    }
    const { answer, gaveUp } = await runSessions(continued, {
      session: (earlier) =>
        this.agent(card, at, buildPrompt(card, earlier, at.name), onActivity),
      head: async () => headOf((await at.build()).path),
      progress: (n, of, text) =>
        this.say(
          card.number,
          `Session ${String(n)} of ${String(of)} done:\n\n${text}`,
          "progress",
        ),
    });
    if (gaveUp !== null) {
      await this.giveUp(card, at, gaveUp.text, gaveUp.note, null);
      return;
    }
    if (answer.status === "blocked") {
      await this.stuck(card.number, answer.text, "blocked");
      return;
    }
    if (answer.status !== "done") {
      await this.giveUp(card, at, answer.text, "failed", null);
      return;
    }
    await this.checkedPullRequest(card, at, answer.text, onActivity);
  }

  // The builder is stuck on the card (a question, or it gave up): it says
  // why, and the card waits in Backlog, marked stuck, for the owner.
  private async stuck(number: number, text: string, note: Note) {
    const { cards } = this.options;
    await this.say(number, text, note);
    await cards.markStuck?.(number, true);
    await cards.move(number, "backlog");
  }

  // A build the builder calls done: the checks, then the pull request.
  private async checkedPullRequest(
    card: BoardCard,
    at: Place,
    text: string,
    onActivity: (line: string) => void,
  ) {
    const { cards, pullRequests } = this.options;
    await keepKnowledge(card, at, pullRequests.baseBranch, (prompt) =>
      this.agent(card, at, prompt, onActivity),
    );
    const checked = await this.checkAndPush(card, at, onActivity);
    if (checked.blocked !== null) {
      await this.stuck(card.number, checked.blocked, "blocked");
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
    const url = await this.pullRequest(card, at, text, false);
    await this.say(
      card.number,
      `Built, and every check passes: ${url} is ready for your review.`,
      "review-ready",
    );
    await cards.move(card.number, "review");
  }

  // The builder gave up: what it did so far goes up as a draft pull request
  // that says what is wrong (none when it changed nothing), and the card
  // waits in Backlog, stuck, for the owner.
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
      ? await this.pullRequest(card, at, `${text}${failed}`, true)
      : null;
    const draft = url
      ? `What it did so far is in a draft pull request, not to merge yet: ${url}`
      : "It changed nothing yet.";
    await this.stuck(card.number, `${text}\n\n${draft}\n\n${HAND_BACK}`, note);
  }

  private async feedback(
    card: BoardCard,
    at: Place,
    onActivity: (line: string) => void,
  ) {
    const pr = card.pullRequest;
    if (!pr) return;
    if (
      await byHand(card, at, this.options.cards, (text) =>
        this.sayOnPullRequest(pr.number, text, "by-hand"),
      )
    )
      return;
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
      // The description stays about the whole card: what this round did
      // is said on the pull request instead.
      if (!checked.passed) {
        await this.options.pullRequests.update(pr.number, null, true);
        await this.sayOnPullRequest(
          pr.number,
          `${answer.text}\n\nThe checks still fail after ${String(FIX_ROUNDS)} rounds of fixing, so this is a draft until they pass:\n\n${checked.report}`,
          "checks-failed",
        );
        return;
      }
      if (pr.draft)
        await this.options.pullRequests.update(pr.number, null, false);
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
    const browser = this.options.browser
      ? await this.options.browser().catch(() => null)
      : null;
    try {
      const copy = await at.build();
      return await builderTurn({
        claude: this.options.claude,
        copy,
        card,
        prompt: withGuides(
          prompt,
          guidesFor(copy.path, this.options.available, "builder"),
        ),
        onActivity,
        model: this.options.model?.(),
        timeLimitMs: this.options.timeLimitMs ?? BUILD_TIME_MS,
        repository: this.options.repository,
        now: this.now(),
        browser: browser
          ? { name: "browser", url: browser.url, headers: {} }
          : null,
      });
    } finally {
      browser?.close();
    }
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
      card: card.number,
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

  // Opens the card's pull request, or updates the one there is, with the
  // screenshots the branch adds; its address.
  private async pullRequest(
    card: BoardCard,
    at: Place,
    text: string,
    draft: boolean,
  ) {
    return await openOrUpdate(this.options.pullRequests, card, text, draft, at);
  }

  private async say(number: number, text: string, note: Note) {
    await this.options.cards.comment(number, markComment(text, note));
  }

  private async sayOnPullRequest(number: number, text: string, note: Note) {
    await this.options.pullRequests.comment(number, markComment(text, note));
  }
}
