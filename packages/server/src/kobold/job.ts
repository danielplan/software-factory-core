// One of the kobold's jobs (kobold.ts): as the page sees it, and as the
// kobold keeps it, with its tools' token, its tools and what stops it.

import { randomUUID } from "node:crypto";

import type { JobTools } from "./tools.ts";

export type KoboldJob = {
  id: string;
  kind: "sort" | "suggest" | "ask" | "seen" | "idea" | "answer" | "check";
  // The signal it sorts, the persona whose problems it reads, the story it
  // asks about, the issue it drafts what was seen for, the persona an own
  // idea is for, the product it checks, or the question it answers.
  about: string;
  // What it made, once done: the new idea's id.
  made: string | null;
  // True until it ends.
  working: boolean;
  // True while it waits for the jobs asked before it to end.
  waiting: boolean;
  // What it is doing now, in a few words.
  activity: string | null;
  // What it did, in a line, once done; or why it could not.
  done: string | null;
  problem: string | null;
};

// A job as the kobold keeps it: its tools' token and tools, and what stops
// it (a person steering it elsewhere). Only its own Claude Code has the
// token, so it never leaves the kobold (shown).
export type Running = KoboldJob & {
  token: string;
  tools: JobTools | null;
  stop: AbortController;
};

// The ended jobs the page still sees.
const KEPT = 20;

// A new job, working; one that runs after the jobs asked before waits.
export function newJob(
  kind: KoboldJob["kind"],
  about: string,
  waiting: boolean,
): Running {
  return {
    id: randomUUID(),
    kind,
    about,
    made: null,
    working: true,
    waiting,
    activity: null,
    done: null,
    problem: null,
    token: randomUUID(),
    tools: null,
    stop: new AbortController(),
  };
}

// The jobs kept: every one not ended, and the last ones that ended.
export function kept(jobs: Running[]): Running[] {
  const ended = jobs.filter((job) => !job.working).slice(-KEPT);
  return jobs.filter((job) => job.working || ended.includes(job));
}

// A job as the page sees it: without its token, its tools and what stops it.
export function shown({
  token: _t,
  tools: _x,
  stop: _s,
  ...seen
}: Running): KoboldJob {
  return seen;
}
