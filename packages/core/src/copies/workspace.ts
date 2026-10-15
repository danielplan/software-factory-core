// Working copies: the factory's own copies of a company's repository, next
// to the owner's checkout, so the owner's files are never touched. Each job
// (a plan, a build, a prototype) works in one, on a branch of its own. All
// copies share one git store; git's lock is waited for, never broken. Files
// git does not keep (pictures, for example) can be linked in from the owner's
// checkout; settings files (.env) never are: a job gets its own.

import { existsSync, globSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { run } from "../processes.ts";

// Settings files an older factory may have copied into a copy; removed when
// found, so a job never runs with the owner's settings.
const LEFT_OUT = /(^|\/)\.env(\.[\w.-]+)?$/;

export type CopySettings = {
  // The owner's checkout, with the local-only files.
  source: string;
  // Where the factory's working copies live.
  workspaces: string;
  baseBranch: string;
  // Folders git does not keep, linked in from the owner's checkout.
  linked?: string[];
};

// All copies share one git store. Downloading into
// it at the same moment fails on git's lock, so the dashboard server's own downloads wait
// for each other, and one that meets the runner's lock tries again.
let gitStoreQueue: Promise<unknown> = Promise.resolve();
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const next = gitStoreQueue.then(work, work);
  gitStoreQueue = next.catch(() => undefined);
  return next;
}

const LOCKED =
  /\.lock'?: File exists|cannot lock ref|Unable to create .*\.lock/;
const TRIES = 5;

export async function retryWhileLocked<T>(
  work: () => Promise<T>,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((done) => setTimeout(done, ms)),
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await work();
    } catch (error) {
      const locked = error instanceof Error && LOCKED.test(error.message);
      if (!locked || attempt >= TRIES) throw error;
      await wait(attempt * 2000);
    }
  }
}

export class Workspace {
  readonly path: string;
  private settings: CopySettings;

  // name: the copy's folder, one per kind of job ("plans", "builds").
  constructor(settings: CopySettings, name: string) {
    if (!/^[a-z][a-z0-9-]*$/.test(name))
      throw new Error(`"${name}" cannot name a working copy.`);
    this.settings = settings;
    this.path = join(settings.workspaces, name);
  }

  // A clean copy of the latest main branch, for reading only.
  async prepareReadOnly(): Promise<void> {
    await this.download();
    await this.git(
      "checkout",
      "--quiet",
      "--force",
      "--detach",
      `origin/${this.settings.baseBranch}`,
    );
    await this.git("clean", "--quiet", "-fd");
    this.bringLocalFiles();
  }

  // A branch kept only on this computer (an idea's prototype): continued when
  // it exists, otherwise started from the latest main.
  async prepareLocalBranch(branch: string): Promise<void> {
    await this.download();
    const exists = await this.git("branch", "--list", branch);
    if (exists.trim() === "")
      await this.git(
        "checkout",
        "--quiet",
        "--force",
        "-b",
        branch,
        `origin/${this.settings.baseBranch}`,
      );
    else await this.git("checkout", "--quiet", "--force", branch);
    await this.git("clean", "--quiet", "-fd");
    this.bringLocalFiles();
  }

  // Commits everything as it is, even nothing, and returns the commit.
  async commitAll(message: string): Promise<string> {
    await this.git("add", "--all");
    await this.gitWithoutHooks(
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      message,
    );
    return (await this.git("rev-parse", "HEAD")).trim();
  }

  // Puts one commit on GitHub as a branch, replacing what the branch had.
  async pushCommit(commit: string, branch: string): Promise<void> {
    await this.gitWithoutHooks(
      "push",
      "--quiet",
      "--force",
      "origin",
      `${commit}:refs/heads/${branch}`,
    );
  }

  private async download(): Promise<void> {
    await oneAtATime(() =>
      retryWhileLocked(async () => {
        await this.ensure();
        await this.git("fetch", "--quiet", "origin");
      }),
    );
  }

  private async ensure(): Promise<void> {
    if (existsSync(join(this.path, ".git"))) return;
    mkdirSync(this.settings.workspaces, { recursive: true });
    await run("git", [
      "-C",
      this.settings.source,
      "worktree",
      "add",
      "--detach",
      this.path,
      `origin/${this.settings.baseBranch}`,
    ]);
  }

  private bringLocalFiles(): void {
    for (const folder of this.settings.linked ?? []) {
      const from = join(this.settings.source, folder);
      const to = join(this.path, folder);
      if (!existsSync(from) || existsSync(to)) continue;
      mkdirSync(dirname(to), { recursive: true });
      symlinkSync(from, to, "junction");
    }
    const settingsFiles = globSync("**/.env*", {
      cwd: this.path,
      exclude: (path) => ["node_modules", ".git"].includes(basename(path)),
    });
    for (const file of settingsFiles.filter((name) => LEFT_OUT.test(name)))
      rmSync(join(this.path, file), { force: true });
  }

  private async git(...args: string[]): Promise<string> {
    return await run("git", ["-C", this.path, ...args]);
  }

  // A draft (a prototype version): its saving commit and push skip the git
  // hooks (lefthook reads LEFTHOOK=0).
  private async gitWithoutHooks(...args: string[]): Promise<string> {
    return await run("git", ["-C", this.path, ...args], {
      env: { LEFTHOOK: "0" },
    });
  }
}
