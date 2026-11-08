// The jobs on a card: the coach plans it (read-only copy of main), the
// builder builds it or answers its review comments (the card's branch in a
// copy of its own). After a build the factory runs the checks itself, gives
// the builder one round to fix a failure, pushes, and opens or updates the
// pull request: a draft that says so when the checks still fail.

import { randomUUID } from "node:crypto";

import { type Available, type Claude, run } from "@software-factory/core";

import type { Cards } from "../cards/cards.ts";
import { branchOf } from "./branches.ts";
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
    if (answer.status !== "done") {
      await this.say(
        card.number,
        answer.text,
        answer.status === "blocked" ? "blocked" : "failed",
      );
      await cards.move(card.number, "planning");
      return;
    }
    const checked = await this.checkAndPush(card, onActivity);
    const url = await this.pullRequest(card, answer.text, checked);
    if (checked.passed) {
      await this.say(
        card.number,
        `Built: ${url} is ready for your review.`,
        "review-ready",
      );
      await cards.move(card.number, "review");
    } else
      await this.say(
        card.number,
        `The work is built, but the checks still fail after one round of fixing, so the pull request is a draft: ${url}\n\nWhat fails is in its description. The card stays in **In progress**: write a comment here to let the builder try again, with any hint you have.`,
        "checks-failed",
      );
  }

  private async feedback(card: BoardCard, onActivity: (line: string) => void) {
    const pr = card.pullRequest;
    if (!pr) return;
    const answer = await this.agent(card, feedbackPrompt(card), onActivity);
    const note: Note = answer.status === "done" ? "fixed" : "blocked";
    if (note === "fixed") {
      const checked = await this.checkAndPush(card, onActivity);
      if (!checked.passed) {
        await this.options.pullRequests.update(
          pr.number,
          `${answer.text}\n\n${failedChecksSection(checked.report)}`,
          true,
        );
        await this.sayOnPullRequest(
          pr.number,
          `${answer.text}\n\nThe checks still fail, so this is a draft again: what fails is in the description.`,
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
    const result = await this.options.claude.run({
      cwd: copy.path,
      prompt,
      readOnly: false,
      session: { id: randomUUID(), resume: false },
      timeLimitMs: this.options.timeLimitMs ?? BUILD_TIME_MS,
      onActivity,
    });
    await this.commitAndPush(
      copy.path,
      branch,
      `#${String(card.number)} ${card.title}`,
    );
    if (!result.ok)
      return {
        status: "failed",
        text: `The build stopped: ${result.error ?? "Claude Code stopped"}. The plan stays: move the card to **Ready** to try again.`,
      };
    const read = readStatusLine(result.text);
    return read.status
      ? {
          status: read.status,
          text: linkRepositoryFiles(read.text, this.options.repository, branch),
        }
      : {
          status: "failed",
          text: `${read.text}\n\nThe builder stopped without saying how it ended. The plan stays: move the card to **Ready** to try again.`,
        };
  }

  // The checks, one round of fixing when they fail, then the branch pushed.
  private async checkAndPush(
    card: BoardCard,
    onActivity: (line: string) => void,
  ) {
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
    if (!checked.passed) {
      await this.agent(card, fixChecksPrompt(card, checked.report), onActivity);
      checked = await check();
    }
    return checked;
  }

  // Opens the card's pull request, or updates the one there is; its address.
  private async pullRequest(
    card: BoardCard,
    text: string,
    checked: { passed: boolean; report: string },
  ) {
    const { pullRequests } = this.options;
    const branch = branchOf(card.number);
    const failed = checked.passed
      ? ""
      : `\n\n${failedChecksSection(checked.report)}`;
    const body = `${text}\n\nCloses #${String(card.number)}.${failed}`;
    const found = await pullRequests.find(branch);
    if (found?.state === "OPEN") {
      await pullRequests.update(found.number, body, !checked.passed);
      return found.url;
    }
    const made = await pullRequests.open({
      branch,
      base: await pullRequests.baseBranch(),
      title: card.title,
      body,
      draft: !checked.passed,
    });
    return made.url;
  }

  private async commitAndPush(folder: string, branch: string, message: string) {
    const git = (...args: string[]) =>
      run("git", ["-C", folder, ...args], { env: { LEFTHOOK: "0" } });
    if ((await git("status", "--porcelain")).trim() !== "") {
      await git(
        "add",
        "--all",
        "--",
        ".",
        ":(exclude,glob)**/.env",
        ":(exclude).env",
      );
      await git("commit", "--quiet", "-m", message);
    }
    await git(
      "push",
      "--quiet",
      "--force",
      "origin",
      `HEAD:refs/heads/${branch}`,
    );
  }

  private async say(number: number, text: string, note: Note) {
    await this.options.cards.comment(number, markComment(text, note));
  }

  private async sayOnPullRequest(number: number, text: string, note: Note) {
    await this.options.pullRequests.comment(number, markComment(text, note));
  }
}
