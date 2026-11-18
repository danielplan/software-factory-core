// Updates: brings the newest main from GitHub into the owner's folder, so
// merged work runs on their computer without anyone typing `git pull`: from
// Workshop's Update button, and by itself every few minutes when the owner
// switched "Update by itself" on (the Updates setting). It only moves the
// folder forward when nothing can be lost (on main, no changed files, no
// commits of its own); otherwise it says why in plain words. The running
// products then restart with the new version.

import { run } from "@software-factory/core";

export type UpdatesState = {
  // The owner's "Update by itself" switch, kept per computer.
  byItself: boolean;
  looking: boolean;
  updating: boolean;
  // Changes on GitHub that this folder does not have yet, newest first.
  waiting: { count: number; titles: string[] };
  // Why the folder cannot take them now, with the files in the way.
  blocked: { reason: string; files: string[] } | null;
  // GitHub could not be reached the last time it looked.
  offline: boolean;
  lastLookAt: string | null;
  lastUpdate: { at: string; count: number } | null;
};

export type Outcome =
  | { kind: "updated"; count: number }
  | { kind: "current" }
  | { kind: "not-updated"; reason: string };

export type Git = (args: string[]) => Promise<{ ok: boolean; log: string[] }>;

// Where the owner's "Update by itself" is kept (a setting).
export type Choice = { read: () => boolean; write: (on: boolean) => void };

const SHOWN_TITLES = 8;
const SHOWN_FILES = 10;

export class ProjectUpdates {
  private readonly git: Git;
  private readonly branch: string;
  private readonly choice: Choice;
  private current: UpdatesState;
  private listeners = new Set<(state: UpdatesState) => void>();
  private timer: NodeJS.Timeout | null = null;

  constructor(options: {
    root: string;
    branch?: string;
    choice?: Choice;
    git?: Git;
  }) {
    this.git = options.git ?? gitIn(options.root);
    this.branch = options.branch ?? "main";
    this.choice = options.choice ?? { read: () => false, write: () => {} };
    this.current = {
      byItself: this.choice.read(),
      looking: false,
      updating: false,
      waiting: { count: 0, titles: [] },
      blocked: null,
      offline: false,
      lastLookAt: null,
      lastUpdate: null,
    };
  }

  get state(): UpdatesState {
    return this.current;
  }

  subscribe(listener: (state: UpdatesState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Asks GitHub what is new, without changing this folder.
  async look(): Promise<void> {
    if (this.current.looking || this.current.updating) return;
    this.change({ looking: true });
    try {
      await this.lookNow();
    } finally {
      this.change({ looking: false });
    }
  }

  // Takes the newest main when nothing can be lost.
  async update(): Promise<Outcome> {
    if (this.current.updating)
      return { kind: "not-updated", reason: "an update is already running" };
    this.change({ updating: true });
    try {
      return await this.updateNow();
    } finally {
      this.change({ updating: false });
    }
  }

  // Looks every few minutes; with "Update by itself" on, also updates.
  follow(everyMs = 5 * 60_000): () => void {
    const round = async () => {
      if (this.current.byItself) await this.update();
      else await this.look();
    };
    this.timer = setInterval(() => void round(), everyMs);
    this.timer.unref();
    return () => {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
    };
  }

  chooseByItself(on: boolean): void {
    this.change({ byItself: on });
    this.choice.write(on);
    if (on) void this.update();
  }

  private async lookNow(): Promise<boolean> {
    const fetched = await this.git(["fetch", "--quiet", "origin", this.branch]);
    const lastLookAt = new Date().toISOString();
    if (!fetched.ok) {
      this.change({ offline: true, lastLookAt });
      return false;
    }
    const [waiting, blocked] = await Promise.all([
      this.waitingChanges(),
      this.whatBlocks(),
    ]);
    this.change({ offline: false, lastLookAt, waiting, blocked });
    return true;
  }

  private async updateNow(): Promise<Outcome> {
    if (!(await this.lookNow()))
      return { kind: "not-updated", reason: "GitHub could not be reached" };
    const { waiting, blocked } = this.current;
    if (waiting.count === 0) return { kind: "current" };
    if (blocked) return { kind: "not-updated", reason: blocked.reason };
    const merged = await this.git([
      "merge",
      "--ff-only",
      `origin/${this.branch}`,
    ]);
    if (!merged.ok) {
      const files = filesInTheWay(merged.log);
      const reason =
        files.length > 0
          ? "files here that git does not keep would be overwritten by the new version"
          : "git could not move this folder forward";
      this.change({ blocked: { reason, files: files.slice(0, SHOWN_FILES) } });
      return { kind: "not-updated", reason };
    }
    const lastUpdate = { at: new Date().toISOString(), count: waiting.count };
    this.change({ waiting: { count: 0, titles: [] }, lastUpdate });
    return { kind: "updated", count: waiting.count };
  }

  private async waitingChanges(): Promise<UpdatesState["waiting"]> {
    const range = `HEAD..origin/${this.branch}`;
    const counted = await this.git([
      "rev-list",
      "--count",
      "--first-parent",
      range,
    ]);
    const count = Number(counted.log[0] ?? 0) || 0;
    if (count === 0) return { count, titles: [] };
    // One line per change merged into main; a pull request's merge is
    // named by its title, which git keeps on the line after "Merge pull request".
    const listed = await this.git([
      "log",
      "--first-parent",
      `--max-count=${String(SHOWN_TITLES)}`,
      "--format=%s%x1f%b%x1e",
      range,
    ]);
    return { count, titles: titlesOf(listed.log.join("\n")) };
  }

  private async whatBlocks(): Promise<UpdatesState["blocked"]> {
    const branch = (await this.git(["branch", "--show-current"])).log[0] ?? "";
    if (branch !== this.branch)
      return {
        reason: `this folder is on the branch "${branch || "none"}", not on ${this.branch}`,
        files: [],
      };
    const status = await this.git([
      "status",
      "--porcelain",
      "--untracked-files=no",
    ]);
    const files = status.log.map((line) => line.slice(3).replaceAll('"', ""));
    if (files.length > 0)
      return {
        reason: `${String(files.length)} file(s) in this folder were changed by hand and are not saved in git`,
        files: files.slice(0, SHOWN_FILES),
      };
    const ahead = await this.git([
      "rev-list",
      "--count",
      `origin/${this.branch}..HEAD`,
    ]);
    const own = Number(ahead.log[0] ?? 0) || 0;
    if (own > 0)
      return {
        reason: `this folder has ${String(own)} saved change(s) of its own that are not on GitHub`,
        files: [],
      };
    return null;
  }

  private change(next: Partial<UpdatesState>): void {
    this.current = { ...this.current, ...next };
    for (const listener of this.listeners) listener(this.current);
  }
}

// Runs git in the folder and keeps its whole answer, never waiting for a
// password prompt nobody sees.
function gitIn(root: string): Git {
  return async (args) => {
    try {
      const out = await run("git", ["-C", root, ...args], {
        env: { GIT_TERMINAL_PROMPT: "0" },
      });
      return { ok: true, log: linesOf(out) };
    } catch (error) {
      return { ok: false, log: linesOf(String(error)) };
    }
  };
}

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line.trim() !== "");
}

// "Merge pull request #51 from …" says little; its title is the body's first line.
function titlesOf(log: string): string[] {
  return log
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "")
    .map((entry) => {
      const [subject = "", body = ""] = entry.split("\x1f");
      const title = body.trim().split("\n")[0]?.trim() ?? "";
      return subject.startsWith("Merge pull request") && title
        ? title
        : subject;
    });
}

// git lists the files it refuses to overwrite one per line, indented.
function filesInTheWay(log: string[]): string[] {
  return log
    .filter((line) => /^\s+\S/.test(line))
    .map((line) => line.trim())
    .filter(
      (line) => !line.startsWith("Please") && !line.startsWith("Aborting"),
    );
}
