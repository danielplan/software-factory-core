// Running prototypes: an exploration's prototypes, each in its own copy of
// the code (copies.ts), started with the company's `prototype.start` command
// and stopped with its `prototype.stop`. The start command says where the
// running version is with a line `FACTORY_URL=<address>`: until then the
// version is starting; once said, it runs there. A start command that
// starts its servers and ends is fine, as is one that keeps running (it is
// stopped with the version). What runs is known only while the factory is
// open; nothing of it is stored.

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { createInterface } from "node:readline";

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
  // What the kobold is doing while it makes it, in a few words, and since
  // when it makes it.
  activity: string | null;
  since: string | null;
  // What the kobold did while it made it, oldest first: its trace.
  steps: string[];
  // Why it stopped or could not start, or what is odd about it.
  problem: string | null;
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
        since: null,
        steps: [],
        problem: null,
      }
    );
  }

  // Changes what is known of a version, and says so.
  set(idea: string, version: string, change: Partial<VersionRun>): void {
    const now = this.runOf(idea, version);
    const run = { ...now, ...change };
    if (run.making && !now.making) run.since = new Date().toISOString();
    this.runs.set(keyOf(idea, version), run);
    this.options.onChange();
  }

  copyOf(idea: string, version: string): PrototypeCopy {
    return this.options.copyOf(idea, version);
  }

  // Starts the version with the project's start command, in its copy (made
  // when it is not there yet). One that runs or starts is left as it is.
  async start(idea: string, version: string): Promise<VersionRun> {
    const copy = this.copyOf(idea, version);
    const start = companyOf(this.options.root).prototype?.start;
    if (!start)
      throw new Refused(
        "This prototype is made, but it cannot run here yet: the project does not say how to start it. Whoever looks after the factory adds that once (the start command in factory.json).",
      );
    const now = this.runOf(idea, version);
    if (now.state === "running" || now.state === "starting") return now;
    this.set(idea, version, { state: "starting", url: null, problem: null });
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
    const child = spawnIn(copy, command);
    this.children.set(key, child);
    const heard = (line: string) => {
      const url = urlIn(line);
      if (url) this.set(idea, version, { state: "running", url });
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
