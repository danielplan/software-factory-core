// The kobold's jobs on the records, each a Claude Code session on this
// computer (read-only, no GitHub, no pushing), with a skill as its method
// and its own tools (tools.ts), which write the records through the store:
// sorting a signal that came in, suggesting a real problem when a new
// problem joins others of one persona, and drafting a question about a
// story's guessed scenes and what was seen once a change is in the app
// ("did it work?"; the understand skill); answering a question about the
// people who use the product, from the records (Ask the kobold); writing a team member's own idea
// with the story it assumes (the explore skill). Every job but the drafts
// runs one at a time, in the order asked; the page sees each job while it
// works and how it ended.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Claude,
  type ClaudeResult,
  howWellKnown,
  KOBOLD,
  type RecordStore,
  type Signal,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

import { problemOf } from "../coach/talk.ts";
import { Refused } from "../refused.ts";
import { type OwnIdea, writeOwnIdea } from "../explore/own-idea.ts";
import {
  answerPrompt,
  askPrompt,
  ideaPrompt,
  sortPrompt,
  suggestPrompt,
} from "./prompts.ts";
import { type KoboldJob, kept, newJob, type Running, shown } from "./job.ts";
import { type JobTools, KOBOLD_HEADER, plain } from "./tools.ts";
import {
  freeProblems,
  said,
  sortSignal,
  suggestRealProblem,
} from "./writes.ts";

export type { KoboldJob } from "./job.ts";

export type KoboldOptions = {
  claude: Claude;
  // The project, where it may read.
  cwd: string;
  records: () => RecordStore;
  onChange: () => void;
};

const RIGHTS = {
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  deny: ["Read(**/.env*)"],
};
const TIME_LIMIT_MS = 10 * 60_000;
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
    return this.jobs.map(shown).reverse();
  }

  // Tells the page the jobs again: something they did changed (a check-up's
  // finding kept, or acted on).
  changed(): void {
    this.options.onChange();
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
    return shown(job);
  }

  // A short question for people like the story's persona, about its guessed
  // scenes, drafted for a person to send.
  async ask(story: string): Promise<string> {
    const store = this.options.records();
    const told = store.get("stories", story);
    if (!told) throw new Refused(`There is no story “${story}”.`);
    if (howWellKnown(told).seen === howWellKnown(told).of)
      throw new Refused("Every scene of it is seen already.");
    return await this.drafted(
      this.add("ask", story, false),
      askPrompt(store.all(), told),
      "Drafted a question to send.",
    );
  }

  // An answer to a question about the people who use the product, from the
  // records and the files it came with (attached); it writes nothing.
  async answer(question: string, attached: string[] = []): Promise<string> {
    if (!question.trim()) throw new Refused("Ask a question first.");
    return await this.drafted(
      this.add("answer", question.trim(), false),
      [answerPrompt(this.options.records().all(), question), ...attached].join(
        "\n",
      ),
      "Answered a question.",
    );
  }

  // Stops a job that is working or waits its turn, so a person can send it
  // elsewhere: Claude Code is closed, and the job ends as stopped.
  stop(id: string): void {
    const job = this.jobs.find((one) => one.id === id);
    if (!job?.working) throw new Refused("That job is not working any more.");
    job.stop.abort();
    this.finish(job, null, "Stopped, to go another way.");
  }

  // What was seen since an issue went to Build, drafted for "did it work?"
  // from what the prompt says; or why the kobold could not.
  async seen(
    issue: number,
    prompt: string,
  ): Promise<{ text: string } | { problem: string }> {
    return await this.draft(
      this.add("seen", String(issue), false),
      prompt,
      "Drafted what was seen.",
    );
  }

  // The story behind a team member's own idea, all guessed, and the idea,
  // written by the kobold (explore skill), after the jobs asked before.
  imagine(own: OwnIdea, attached: string[] = []): KoboldJob {
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
        [ideaPrompt(store.all(), own), ...attached].join("\n"),
        "explore",
      );
      if (!result.ok)
        this.finish(job, null, problemOf(result.error ?? "", "The kobold"));
      else if (job.made === null)
        this.finish(job, null, `The kobold wrote no idea. ${result.text}`);
      else this.finish(job, "Wrote the idea and the story it assumes.", null);
    });
    return shown(job);
  }

  private async sorting(job: Running, hint: string | null): Promise<void> {
    const store = this.options.records();
    const signal = store.get("signals", job.about);
    if (!signal) {
      this.finish(job, null, "The signal is not there any more.");
      return;
    }
    if (hint === null && placedByPerson(signal)) {
      this.finish(job, `Already placed by ${signal.by}.`, null);
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
      this.suggestAfter(job.about, before);
    }
  }

  // A real problem suggested when the sort gave a persona a new problem,
  // and two or more of theirs have none behind them.
  private suggestAfter(signal: string, before: Map<string, number>): void {
    const store = this.options.records();
    const persona = store.get("signals", signal)?.soundsLike;
    const now = freeProblems(store).get(persona ?? "") ?? 0;
    if (persona && now >= 2 && now > (before.get(persona) ?? 0))
      this.suggest(persona);
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

  // A check-up of a product (checks/): the check skill and its tool to
  // report what it finds, after the jobs asked before.
  check(product: string, prompt: string, tools: JobTools): KoboldJob {
    const job = this.add("check", product);
    this.queue(job, async () => {
      job.tools = tools;
      const result = await this.run(job, prompt, "check");
      if (!result.ok)
        this.finish(job, null, problemOf(result.error ?? "", "The kobold"));
      else this.finish(job, result.text.trim() || "Checked.", null);
    });
    return shown(job);
  }

  // A short text the kobold drafts for a person, with no tools.
  private async draft(
    job: Running,
    prompt: string,
    done: string,
  ): Promise<{ text: string } | { problem: string }> {
    const result = await this.run(job, prompt);
    const text = result.text.trim();
    if (!result.ok || !text) {
      const problem = problemOf(result.error ?? "", "The kobold");
      this.finish(job, null, problem);
      return { problem };
    }
    this.finish(job, done, null);
    return { text };
  }

  // A draft, or why not, refused.
  private async drafted(
    job: Running,
    prompt: string,
    done: string,
  ): Promise<string> {
    const drafted = await this.draft(job, prompt, done);
    if ("problem" in drafted) throw new Refused(drafted.problem);
    return drafted.text;
  }

  // A new job; one that runs after the jobs asked before waits until then.
  private add(kind: KoboldJob["kind"], about: string, waiting = true) {
    const job = newJob(kind, about, waiting);
    this.jobs = kept([...this.jobs, job]);
    this.options.onChange();
    return job;
  }

  // After the jobs asked before; a job that fails says why, and the next
  // one runs anyway.
  private queue(job: Running, work: () => Promise<void>): void {
    this.line = this.line.then(async () => {
      if (job.stop.signal.aborted) return;
      job.waiting = false;
      this.options.onChange();
      await work().catch((error: unknown) => {
        this.finish(job, null, error instanceof Error ? error.message : "");
      });
    });
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
      stop: job.stop.signal,
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

  // Once: a job stopped by a person keeps saying so when its run ends.
  private finish(job: Running, done: string | null, problem: string | null) {
    if (!job.working) return;
    Object.assign(job, {
      working: false,
      waiting: false,
      activity: null,
      done,
      problem,
    });
    job.tools = null;
    this.options.onChange();
  }
}

// A signal a person placed (moved it, or said it looks good): a sort asked
// before then leaves their choice as it is.
function placedByPerson(signal: Signal): boolean {
  return signal.by !== KOBOLD && signal.wentTo !== null;
}
