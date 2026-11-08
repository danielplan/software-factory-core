// The jobs on a card: the coach plans it (read-only copy of main), the
// builder builds it or answers its review comments (the card's branch in a
// copy of its own). After a build the factory runs the checks itself, gives
// the builder up to three rounds to fix what is red, pushes, and opens the
// pull request once every check passes. When it gives up, what it did goes
// up as a draft pull request that says what is wrong, and the card waits in
// In progress.

import { randomUUID } from "node:crypto";

import { type Available, type Claude } from "@software-factory/core";

import type { Cards } from "../cards/cards.ts";
import { branchOf, commitAndPush } from "./branches.ts";
import {
  changedFiles,
  checksFor,
  failedChecksSection,
  runChecks,
  type Shell,
} from "./checks.ts";
import type { BoardCard, Job } from "./decide.ts";
import {
  buildPrompt,
  feedbackPrompt,
  fixChecksPrompt,
  CARRY_ON,
  planPrompt,
} from "./prompts.ts";
import {
  linkRepositoryFiles,
  markComment,
  type Note,
  readNote,
  readStatusLine,
} from "./protocol.ts";
import type { PullRequests } from "./pull-requests.ts";

export type ReadCopy = { path: string; prepareReadOnly: () => Promise<void> };
export type BuildCopy = {
  path: string;
  prepareSharedBranch: (branch: string) => Promise<void>;
};

export type JobsOptions = {
  cards: Cards;
  pullRequests: PullRequests;
  claude: Claude;
  repository: string;
  available: Available;
  copies: { chat: () => Promise<ReadCopy>; build: () => Promise<BuildCopy> };
  shell?: Shell;
  timeLimitMs?: number;
};

const BUILD_TIME_MS = 3 * 60 * 60_000;
const PLAN_TIME_MS = 20 * 60_000;
// Rounds of fixing while a check is red, before the owner is asked.
const FIX_ROUNDS = 3;
// Times a turn that stopped halfway is told to carry on.
const NUDGES = 2;
const PLAN_NOTES: readonly Note[] = ["question", "plan-agreed", "blocked"];

export class Jobs {
  private readonly options: JobsOptions;

  constructor(options: JobsOptions) {
    this.options = options;
  }

  async run(job: Job, card: BoardCard, onActivity: (line: string) => void) {
    if (job.kind === "plan") await this.plan(card, onActivity);
    else if (job.kind === "build") await this.build(card, onActivity);
    else await this.feedback(card, onActivity);
  }

  private async plan(card: BoardCard, onActivity: (line: string) => void) {
    const { cards, claude } = this.options;
    const copy = await this.options.copies.chat();
    await copy.prepareReadOnly();
    const result = await claude.run({
      cwd: copy.path,
      prompt: planPrompt(card),
      readOnly: true,
      tools: ["Read", "Grep", "Glob"],
      deny: ["Read(**/.env*)"],
      session: { id: randomUUID(), resume: false },
      timeLimitMs: PLAN_TIME_MS,
      onActivity,
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

  private async build(card: BoardCard, onActivity: (line: string) => void) {
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
    const answer = await this.agent(
      card,
      buildPrompt(card, continued),
      onActivity,
    );
    if (answer.status === "blocked") {
      await this.say(card.number, answer.text, "blocked");
      await cards.move(card.number, "planning");
      return;
    }
    if (answer.status !== "done") {
      await this.giveUp(card, answer.text, "failed", null);
      return;
    }
    const checked = await this.checkAndPush(card, onActivity);
    if (checked.blocked !== null) {
      await this.say(card.number, checked.blocked, "blocked");
      await cards.move(card.number, "planning");
      return;
    }
    if (!checked.passed) {
      await this.giveUp(
        card,
        `${answer.text}\n\nThe work is built, but the checks still fail after ${String(FIX_ROUNDS)} rounds of fixing.`,
        "checks-failed",
        checked.report,
      );
      return;
    }
    const url = await this.pullRequest(card, answer.text, false);
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
    text: string,
    note: Note,
    report: string | null,
  ) {
    const copy = await this.options.copies.build();
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

  private async feedback(card: BoardCard, onActivity: (line: string) => void) {
    const pr = card.pullRequest;
    if (!pr) return;
    const answer = await this.agent(card, feedbackPrompt(card), onActivity);
    const note: Note = answer.status === "done" ? "fixed" : "blocked";
    if (note === "fixed") {
      const checked = await this.checkAndPush(card, onActivity);
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

  // The builder's turn on the card's branch; what it did is committed and
  // pushed whenever it ran, so a question or a review continues from it.
  private async agent(
    card: BoardCard,
    prompt: string,
    onActivity: (line: string) => void,
  ) {
    const copy = await this.options.copies.build();
    const branch = branchOf(card.number);
    await copy.prepareSharedBranch(branch);
    const id = randomUUID();
    const turn = (text: string, resume: boolean) =>
      this.options.claude.run({
        cwd: copy.path,
        prompt: text,
        readOnly: false,
        session: { id, resume },
        timeLimitMs: this.options.timeLimitMs ?? BUILD_TIME_MS,
        onActivity,
      });
    let result = await turn(prompt, false);
    // A turn that ends without its status line stopped halfway (waiting for
    // something it left running, say): the same conversation goes on.
    for (
      let nudge = 1;
      result.ok && !readStatusLine(result.text).status && nudge <= NUDGES;
      nudge++
    )
      result = await turn(CARRY_ON, true);
    await commitAndPush(
      copy.path,
      branch,
      `#${String(card.number)} ${card.title}`,
    );
    if (!result.ok)
      return {
        status: "failed",
        text: `The build stopped: ${result.error ?? "Claude Code stopped"}.`,
      };
    const read = readStatusLine(result.text);
    return read.status
      ? {
          status: read.status,
          text: linkRepositoryFiles(read.text, this.options.repository, branch),
        }
      : {
          status: "failed",
          text: `${read.text}\n\nThe builder stopped ${String(NUDGES + 1)} times without finishing.`,
        };
  }

  // The checks, and up to FIX_ROUNDS rounds of fixing while any is red (the
  // builder fixes every red check, also one that was red before its change);
  // it stops early when the builder says only the owner can unblock it.
  private async checkAndPush(
    card: BoardCard,
    onActivity: (line: string) => void,
  ): Promise<{ passed: boolean; report: string; blocked: string | null }> {
    const copy = await this.options.copies.build();
    const check = async () => {
      const base = await this.options.pullRequests.baseBranch();
      const checks = checksFor(
        copy.path,
        this.options.available,
        await changedFiles(copy.path, base),
      );
      return await runChecks(copy.path, checks, this.options.shell, (c) => {
        onActivity(`Checking ${c.name}: ${c.command}`);
      });
    };
    let checked = await check();
    for (let round = 1; !checked.passed && round <= FIX_ROUNDS; round++) {
      const answer = await this.agent(
        card,
        fixChecksPrompt(card, checked.report, round, FIX_ROUNDS),
        onActivity,
      );
      if (answer.status === "blocked")
        return { ...checked, blocked: answer.text };
      checked = await check();
    }
    return { ...checked, blocked: null };
  }

  // Opens the card's pull request, or updates the one there is; its address.
  private async pullRequest(card: BoardCard, text: string, draft: boolean) {
    const { pullRequests } = this.options;
    const branch = branchOf(card.number);
    const body = `${text}\n\nCloses #${String(card.number)}.`;
    const found = await pullRequests.find(branch);
    if (found?.state === "OPEN") {
      await pullRequests.update(found.number, body, draft);
      return found.url;
    }
    const made = await pullRequests.open({
      branch,
      base: await pullRequests.baseBranch(),
      title: card.title,
      body,
      draft,
    });
    return made.url;
  }

  private async say(number: number, text: string, note: Note) {
    await this.options.cards.comment(number, markComment(text, note));
  }

  private async sayOnPullRequest(number: number, text: string, note: Note) {
    await this.options.pullRequests.comment(number, markComment(text, note));
  }
}
