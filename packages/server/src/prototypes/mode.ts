// Running prototypes: an exploration's prototypes, each in its own copy of
// the code (copies.ts), started with the company's `prototype.start` command
// and stopped with its `prototype.stop`. The start command says where the
// running version is with a line `FACTORY_URL=<address>`: until then the
// version is starting; once said, it runs there. A start command that
// starts its servers and ends is fine, as is one that keeps running (it is
// stopped with the version). What runs is known only while the factory is
// open; nothing of it is stored.

import { stripVTControlCharacters } from "node:util";
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

import type { DoingKind } from "@software-factory/core";

import { Refused } from "../refused.ts";
import {
  companyOf,
  type PrototypeCopy,
  urlIn,
  versionWorkspace,
} from "./copies.ts";

export type RunState = "stopped" | "starting" | "running" | "failed";

// A version as prototype mode knows it now.
export type VersionRun = {
  idea: string;
  version: string;
  state: RunState;
  // Being made by the kobold now: it may run meanwhile, and the page
  // reloads as the kobold changes it.
  making: boolean;
  // Where it runs, once the start command said so.
  url: string | null;
  // What the kobold is doing while it makes it, in a few words (for the
  // kobold who talks with the team), the kind of that action (for the page,
  // which words it), and since when it makes it.
  activity: string | null;
  doing: DoingKind | null;
  since: string | null;
  // What the kobold did while it made it, oldest first: its trace.
  steps: string[];
  // Why it stopped or could not start, or what is odd about it.
  problem: string | null;
  // Why Tinker could not work out how to start the app, in plain words
  // (the project has no start command); none otherwise.
  startProblem: string | null;
  // While it starts: the step it is on (its copy of the code made, Tinker
  // working out how to start the app when the project has no start command,
  // then the start command running), the start command's latest line, and
  // since when.
  start: {
    step: "copy" | "setup" | "command";
    line: string | null;
    since: string;
  } | null;
};

export type ModeOptions = {
  project: string;
  // The factory's folder (its company file names the commands).
  root: string;
  onChange: () => void;
  // Where a prototype's copy is (an exploration's prototype of an option).
  copyOf: (idea: string, version: string) => PrototypeCopy;
};

// The last lines a failed command printed, to say why.
const KEPT_LINES = 6;

// How long a start command Tinker proposes has to come up.
const TRIAL_WITHIN_MS = 3 * 60_000;

// Whether an address answers with a page.
async function answers(url: string): Promise<boolean> {
  try {
    const reply = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return reply.status < 500;
  } catch {
    return false;
  }
}

export class PrototypeMode {
  readonly options: ModeOptions;
  private readonly runs = new Map<string, VersionRun>();
  private readonly children = new Map<string, ChildProcess>();

  constructor(options: ModeOptions) {
    this.options = options;
  }

  // The versions prototype mode knows of now, of one idea or of all.
  view(idea?: string): VersionRun[] {
    return [...this.runs.values()].filter((r) => !idea || r.idea === idea);
  }

  // What a version is doing now; a version not seen yet is stopped.
  runOf(idea: string, version: string): VersionRun {
    return (
      this.runs.get(keyOf(idea, version)) ?? {
        idea,
        version,
        state: "stopped",
        making: false,
        url: null,
        activity: null,
        doing: null,
        since: null,
        steps: [],
        problem: null,
        startProblem: null,
        start: null,
      }
    );
  }

  // Changes what is known of a version, and says so.
  set(idea: string, version: string, change: Partial<VersionRun>): void {
    const now = this.runOf(idea, version);
    const run = { ...now, ...change };
    if (run.state !== "starting") run.start = null;
    if (run.making && !now.making) run.since = new Date().toISOString();
    this.runs.set(keyOf(idea, version), run);
    this.options.onChange();
  }

  copyOf(idea: string, version: string): PrototypeCopy {
    return this.options.copyOf(idea, version);
  }

  // Whether the project says how to start a prototype (its start command
  // in factory.json); a company file that cannot be read says no.
  canStart(): boolean {
    return this.startOf() !== null;
  }

  // The start command the project names (written by the team, or worked
  // out by Tinker), and who worked it out; none when there is none.
  startOf(): { command: string; by: "tinker" | null } | null {
    try {
      const prototype = companyOf(this.options.root).prototype;
      return prototype
        ? { command: prototype.start, by: prototype.by ?? null }
        : null;
    } catch (error) {
      if (error instanceof Refused) return null;
      throw error;
    }
  }

  // Starts the version with the project's start command, in its copy (made
  // when it is not there yet). One that runs or starts is left as it is.
  async start(idea: string, version: string): Promise<VersionRun> {
    const copy = this.copyOf(idea, version);
    const start = companyOf(this.options.root).prototype?.start;
    if (!start)
      throw new Refused(
        "This prototype cannot run yet: the project has no start command, and Tinker has not worked one out.",
      );
    const now = this.runOf(idea, version);
    if (now.state === "running" || now.state === "starting") return now;
    const since = new Date().toISOString();
    this.set(idea, version, {
      state: "starting",
      url: null,
      problem: null,
      startProblem: null,
      start: { step: "copy", line: null, since },
    });
    try {
      await versionWorkspace(this.options.project, copy);
    } catch (error) {
      this.set(idea, version, { state: "failed", problem: messageOf(error) });
      return this.runOf(idea, version);
    }
    this.launch(idea, version, copy, start);
    return this.runOf(idea, version);
  }

  // Stops the version: what its start command left running, then the
  // project's stop command, if it has one.
  async stop(idea: string, version: string): Promise<void> {
    const copy = this.copyOf(idea, version);
    this.end(keyOf(idea, version));
    const stop = companyOf(this.options.root).prototype?.stop;
    if (stop && existsSync(copy.folder)) {
      const { code, lines } = await this.finished(spawnIn(copy, stop));
      if (code !== 0) {
        this.set(idea, version, { state: "failed", problem: said(lines) });
        return;
      }
    }
    this.set(idea, version, { state: "stopped", url: null, problem: null });
  }

  // Tries a start command in the version's copy, beside whatever else runs:
  // it must say where it runs (FACTORY_URL=…) and that address must answer.
  // It is stopped again; nothing of it is kept. Why not, when it fails.
  async trial(
    idea: string,
    version: string,
    command: string,
    within = TRIAL_WITHIN_MS,
  ): Promise<{ ok: true } | { ok: false; why: string }> {
    const copy = this.copyOf(idea, version);
    await versionWorkspace(this.options.project, copy);
    const key = `${keyOf(idea, version)}#trial`;
    const child = spawnIn(copy, command);
    this.children.set(key, child);
    const seen: { url: string | null; over: boolean } = {
      url: null,
      over: false,
    };
    const ended = this.finished(child, (line) => {
      seen.url = urlIn(line) ?? seen.url;
    });
    void ended.then(() => {
      seen.over = true;
    });
    const until = Date.now() + within;
    let answered = false;
    while (!seen.over && !answered && Date.now() < until) {
      if (seen.url !== null) answered = await answers(seen.url);
      if (!answered) await new Promise((done) => setTimeout(done, 400));
    }
    const ownEnd = seen.over;
    this.end(key);
    const { lines } = await ended;
    if (answered) return { ok: true };
    if (seen.url !== null)
      return {
        ok: false,
        why: `It said it runs at ${seen.url}, but nothing answered there.`,
      };
    return {
      ok: false,
      why: ownEnd
        ? said(lines)
        : `Nothing said where it runs within ${String(Math.round(within / 60_000))} minutes. ${lines.join("\n")}`.trim(),
    };
  }

  // What still runs is stopped with the factory.
  close(): void {
    for (const key of [...this.children.keys()]) this.end(key);
  }

  // The start command, running: its address once it says it, and why when
  // it fails.
  private launch(
    idea: string,
    version: string,
    copy: PrototypeCopy,
    command: string,
  ): void {
    const key = keyOf(idea, version);
    // One that is still there (a start stopped while its copy was made)
    // does not stay running unseen.
    this.end(key);
    const child = spawnIn(copy, command);
    this.children.set(key, child);
    const since = this.runOf(idea, version).start?.since;
    const step = (line: string | null) => ({
      step: "command" as const,
      line,
      since: since ?? new Date().toISOString(),
    });
    this.set(idea, version, { start: step(null) });
    const heard = (line: string) => {
      const url = urlIn(line);
      if (url) this.set(idea, version, { state: "running", url });
      else if (this.runOf(idea, version).state === "starting" && line.trim())
        this.set(idea, version, { start: step(shortLine(line)) });
    };
    void this.finished(child, heard).then(({ code, lines }) => {
      if (this.children.get(key) !== child) return;
      this.children.delete(key);
      const { state, url } = this.runOf(idea, version);
      if (code !== 0)
        this.set(idea, version, { state: "failed", problem: said(lines) });
      else if (state === "starting" || url === null)
        this.set(idea, version, {
          state: "running",
          problem:
            "It started, but did not say where: the start command prints a line FACTORY_URL=<address>.",
        });
    });
  }

  // Every line it printed, as it prints them, and how it ended.
  private async finished(
    child: ChildProcess,
    heard: (line: string) => void = () => {},
  ): Promise<{ code: number; lines: string[] }> {
    const lines: string[] = [];
    for (const stream of [child.stdout, child.stderr])
      if (stream)
        createInterface({ input: stream }).on("line", (line) => {
          lines.push(line);
          heard(line);
        });
    const code = await new Promise<number>((done) => {
      child.on("error", (error) => {
        lines.push(error.message);
        done(1);
      });
      child.on("close", (status) => {
        done(status ?? 1);
      });
    });
    return { code, lines: lines.slice(-KEPT_LINES) };
  }

  // A start command that still runs is ended, with all it started.
  private end(key: string): void {
    const child = this.children.get(key);
    this.children.delete(key);
    if (child?.pid === undefined || child.exitCode !== null) return;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

// A project command in the copy (its own process group, so it can be
// stopped with all it started), told which version and where.
function spawnIn(copy: PrototypeCopy, command: string): ChildProcess {
  return spawn(command, {
    cwd: existsSync(copy.folder) ? copy.folder : dirname(copy.folder),
    shell: true,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...copy.env },
  });
}

function said(lines: string[]): string {
  const text = lines.join("\n").trim();
  return text ? `It stopped: ${text}` : "It stopped without saying why.";
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function keyOf(idea: string, version: string): string {
  return `${idea}/${version}`;
}

// A start command's line as the page shows it: without colours, cut short.
function shortLine(line: string): string {
  const plain = stripVTControlCharacters(line).trim();
  return plain.length > 90 ? `${plain.slice(0, 89)}…` : plain;
}
