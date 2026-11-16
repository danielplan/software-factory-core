// The kobold's jobs on the records, each a Claude Code session on this
// computer (read-only, no GitHub, no pushing), with a skill as its method
// and its own tools (tools.ts), which write the records through the store:
// sorting a signal that came in, suggesting a real problem when a new
// problem joins others of one persona, and drafting a question about a
// story's guessed scenes (the understand skill); writing a team member's own
// idea with the story it assumes (the explore skill). Every job but asking
// runs one at a time, in the order asked; the page sees each job while it
// works and how it ended.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Claude,
  type ClaudeResult,
  howWellKnown,
  type RecordStore,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

import { problemOf } from "../coach/talk.ts";
import { Refused } from "../refused.ts";
import { type OwnIdea, writeOwnIdea } from "../explore/own-idea.ts";
import { askPrompt, ideaPrompt, sortPrompt, suggestPrompt } from "./prompts.ts";
import { type JobTools, KOBOLD_HEADER } from "./tools.ts";
import { sortSignal, suggestRealProblem } from "./writes.ts";

export type KoboldJob = {
  id: string;
  kind: "sort" | "suggest" | "ask" | "idea";
  // The signal it sorts, the persona whose problems it reads, the story it
  // asks about, or the persona an own idea is for.
  about: string;
  // What it made, once done: the new idea's id.
  made: string | null;
  working: boolean;
  // What it is doing now, in a few words.
  activity: string | null;
  // What it did, in a line, once done; or why it could not.
  done: string | null;
  problem: string | null;
};

export type KoboldOptions = {
  claude: Claude;
  // The project, where it may read.
  cwd: string;
  records: () => RecordStore;
  onChange: () => void;
};

type Running = KoboldJob & { token: string; tools: JobTools | null };

const RIGHTS = {
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  deny: ["Read(**/.env*)"],
};
const TIME_LIMIT_MS = 10 * 60_000;
// The jobs the page still sees.
const KEPT = 20;
const TOOL_LINES: Record<string, string> = {
  sort_signal: "Putting it in its place",
  suggest_real_problem: "Suggesting a real problem",
  write_idea: "Writing the idea and its story",
};

export class Kobold {
  private readonly options: KoboldOptions;
  private jobs: Running[] = [];
  private line: Promise<void> = Promise.resolve();
  private toolsUrl = "";

  constructor(options: KoboldOptions) {
    this.options = options;
  }

  // Where the server answers the jobs' tools, once it listens.
  serveToolsAt(url: string): void {
    this.toolsUrl = url;
  }

  // Newest first.
  view(): KoboldJob[] {
    return this.jobs.map(({ token: _t, tools: _x, ...job }) => job).reverse();
  }

  // The tools of the job with this token, while it works.
  toolsOf(token: string): JobTools | null {
    return this.jobs.find((j) => j.working && j.token === token)?.tools ?? null;
  }

  // Sorting a signal, after the jobs asked before; with what the person who
  // moved it said, when it is sorted again.
  sort(signal: string, hint: string | null = null): KoboldJob {
    const job = this.add("sort", signal);
    this.queue(job, () => this.sorting(job, hint));
    return { ...job };
  }

  // A short question for people like the story's persona, about its guessed
  // scenes, drafted for a person to send.
  async ask(story: string): Promise<string> {
    const store = this.options.records();
    const told = store.get("stories", story);
    if (!told) throw new Refused(`There is no story “${story}”.`);
    if (howWellKnown(told).seen === howWellKnown(told).of)
      throw new Refused("Every scene of it is seen already.");
    const job = this.add("ask", story);
    const result = await this.run(job, askPrompt(store.all(), told));
    const text = result.text.trim();
    if (!result.ok || !text) {
      const problem = problemOf(result.error ?? "", "The kobold");
      this.finish(job, null, problem);
      throw new Refused(problem);
    }
    this.finish(job, "Drafted a question to send.", null);
    return text;
  }

  // The story behind a team member's own idea, all guessed, and the idea,
  // written by the kobold (explore skill), after the jobs asked before.
  imagine(own: OwnIdea): KoboldJob {
    const store = this.options.records();
    if (!own.text.trim()) throw new Refused("Say what the idea is first.");
    if (!store.get("personas", own.persona))
      throw new Refused(`There is no persona “${own.persona}”.`);
    const job = this.add("idea", own.persona);
    this.queue(job, async () => {
      job.tools = {
        tool: "write_idea",
        act: (args) => {
          const { idea, done } = writeOwnIdea(store, own, args);
          job.made = idea;
          return done;
        },
      };
      const result = await this.run(
        job,
        ideaPrompt(store.all(), own),
        "explore",
      );
      if (!result.ok)
        this.finish(job, null, problemOf(result.error ?? "", "The kobold"));
      else if (job.made === null)
        this.finish(job, null, `The kobold wrote no idea. ${result.text}`);
      else this.finish(job, "Wrote the idea and the story it assumes.", null);
    });
    return { ...job };
  }

  private async sorting(job: Running, hint: string | null): Promise<void> {
    const store = this.options.records();
    const signal = store.get("signals", job.about);
    if (!signal) {
      this.finish(job, null, "The signal is not there any more.");
      return;
    }
    const before = freeProblems(store);
    const done: string[] = [];
    job.tools = {
      tool: "sort_signal",
      act: (args) => said(done, sortSignal(store, job.about, args)),
    };
    const result = await this.run(job, sortPrompt(store.all(), signal, hint));
    const last = done.at(-1);
    if (!result.ok)
      this.finish(job, null, problemOf(result.error ?? "", "The kobold"));
    else if (last === undefined)
      this.finish(job, null, `The kobold did not sort it. ${result.text}`);
    else {
      this.finish(job, last, null);
      const persona = store.get("signals", job.about)?.soundsLike;
      const now = freeProblems(store).get(persona ?? "") ?? 0;
      if (persona && now >= 2 && now > (before.get(persona) ?? 0))
        this.suggest(persona);
    }
  }

  private suggest(persona: string): void {
    const job = this.add("suggest", persona);
    this.queue(job, async () => {
      const store = this.options.records();
      const done: string[] = [];
      job.tools = {
        tool: "suggest_real_problem",
        act: (args) => said(done, suggestRealProblem(store, persona, args)),
      };
      const result = await this.run(job, suggestPrompt(store.all(), persona));
      if (!result.ok)
        this.finish(job, null, problemOf(result.error ?? "", "The kobold"));
      else this.finish(job, done.at(-1) ?? result.text.trim(), null);
    });
  }

  private add(kind: KoboldJob["kind"], about: string): Running {
    const job: Running = {
      id: randomUUID(),
      kind,
      about,
      made: null,
      working: true,
      activity: null,
      done: null,
      problem: null,
      token: randomUUID(),
      tools: null,
    };
    this.jobs = [...this.jobs, job].slice(-KEPT);
    this.options.onChange();
    return job;
  }

  // After the jobs asked before; a job that fails says why, and the next
  // one runs anyway.
  private queue(job: Running, work: () => Promise<void>): void {
    this.line = this.line.then(() =>
      work().catch((error: unknown) => {
        this.finish(job, null, error instanceof Error ? error.message : "");
      }),
    );
  }

  private async run(
    job: Running,
    prompt: string,
    skill = "understand",
  ): Promise<ClaudeResult> {
    return await this.options.claude.run({
      cwd: this.options.cwd,
      prompt,
      ...RIGHTS,
      instructions: readFileSync(join(skillsFolder, skill, "SKILL.md"), "utf8"),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: TIME_LIMIT_MS,
      ...(job.tools
        ? {
            mcp: {
              name: "kobold",
              url: this.toolsUrl,
              headers: { [KOBOLD_HEADER]: job.token },
            },
          }
        : {}),
      onActivity: (line) => {
        const shown = plain(line);
        if (!shown) return;
        job.activity = shown;
        this.options.onChange();
      },
    });
  }

  private finish(job: Running, done: string | null, problem: string | null) {
    Object.assign(job, { working: false, activity: null, done, problem });
    job.tools = null;
    this.options.onChange();
  }
}

// A line of what Claude Code does, as a person sees it; null to skip.
function plain(line: string): string | null {
  const tool = /^Using mcp__kobold__(\w+)/.exec(line)?.[1];
  if (tool) return TOOL_LINES[tool] ?? null;
  return /^(Reading|Searching|Looking)/.test(line) ? line : null;
}

// What a tool did, kept for the job's end, and said to the kobold.
function said(done: string[], line: string): string {
  done.push(line);
  return line;
}

// How many problems of each persona have no real problem behind them.
function freeProblems(store: RecordStore): Map<string, number> {
  const free = new Map<string, number>();
  for (const problem of store.list("problems"))
    if (problem.realProblem === null)
      free.set(problem.persona, (free.get(problem.persona) ?? 0) + 1);
  return free;
}
