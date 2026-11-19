// Working copies: the factory's own copies of a company's repository, next
// to the owner's checkout, so the owner's files are never touched. Each job
// (a plan, a build, a prototype) works in one, on a branch of its own. All
// copies share one git store; git's lock is waited for, never broken. Files
// git does not keep (pictures, for example) can be linked in from the owner's
// checkout; settings files (.env) never are: a job gets its own.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { basename, dirname, join, sep } from "node:path";

import { run } from "../processes.ts";
import { freeBranch } from "./free-branch.ts";

// Settings files an older factory may have copied into a copy; removed when
// found, so a job never runs with the owner's settings. The examples the
// project keeps (.env.example, .env.test.example …) stay: a copy's own
// settings start from them.
const EXAMPLE_END = ".example";

function isSettings(file: string): boolean {
  const name = basename(file);
  return name === ".env" || name.startsWith(".env.");
}

function isExample(file: string): boolean {
  return isSettings(file) && file.endsWith(EXAMPLE_END);
}

function leftOut(file: string): boolean {
  return isSettings(file) && !isExample(file);
}

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
// for each other, and one that meets another program's lock tries again.
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

  // A prototype's branch: continued when this computer has it, otherwise
  // started from origin's when a teammate pushed it (pushBranch), otherwise
  // from the latest main.
  async prepareLocalBranch(branch: string): Promise<void> {
    await this.download();
    const exists = await this.git("branch", "--list", branch);
    if (exists.trim() === "") {
      const pushed = await this.git(
        "branch",
        "--remotes",
        "--list",
        `origin/${branch}`,
      );
      const from = pushed.trim() === "" ? this.settings.baseBranch : branch;
      await this.git(
        "checkout",
        "--quiet",
        "--force",
        "-b",
        branch,
        `origin/${from}`,
      );
    } else await this.git("checkout", "--quiet", "--force", branch);
    await this.git("clean", "--quiet", "-fd");
    this.bringLocalFiles();
  }

  // A branch kept on GitHub (a card's build): continued from what GitHub
  // has when it is there, otherwise started from the latest main. Work this
  // copy has that GitHub has not yet (a build stopped when the factory
  // closed) is continued as it is, uncommitted changes too; when GitHub's
  // branch went another way, that work is kept on a branch of its own.
  async prepareSharedBranch(branch: string): Promise<void> {
    await this.download();
    await freeBranch(this.path, branch, this.path);
    const remote = await this.git(
      "branch",
      "--remotes",
      "--list",
      `origin/${branch}`,
    );
    const onGitHub = remote.trim() !== "";
    if (await this.continuesLocally(branch, onGitHub)) {
      this.bringLocalFiles();
      return;
    }
    const from = onGitHub ? branch : this.settings.baseBranch;
    await this.git(
      "checkout",
      "--quiet",
      "--force",
      "-B",
      branch,
      `origin/${from}`,
    );
    await this.git("clean", "--quiet", "-fd");
    this.bringLocalFiles();
  }

  // Brings the latest main into the card's branch before more work on it.
  // Nothing to do when the branch has main already or has uncommitted work
  // (it is merged next time). A clash leaves the merge open for the agent:
  // the files that clash, none when it went in by itself.
  async bringInMain(): Promise<string[]> {
    const main = `origin/${this.settings.baseBranch}`;
    if (await this.succeeds("merge-base", "--is-ancestor", main, "HEAD"))
      return [];
    if ((await this.git("status", "--porcelain")).trim() !== "") return [];
    if (
      await this.succeedsWithoutHooks(
        "merge",
        "--quiet",
        "--no-edit",
        "-m",
        `Bring in the latest ${this.settings.baseBranch}`,
        main,
      )
    )
      return [];
    return await this.clashing();
  }

  // The files a merge left clashing.
  async clashing(): Promise<string[]> {
    const out = await this.git("diff", "--name-only", "--diff-filter=U");
    return out.split("\n").filter((line) => line.trim() !== "");
  }

  // Gives up a merge the agent could not finish.
  async abortMerge(): Promise<void> {
    await this.succeeds("merge", "--abort");
  }

  // Commits everything as it is, even nothing, and returns the commit.
  async commitAll(message: string): Promise<string> {
    await stageAllButSettings(this.path);
    await this.gitWithoutHooks(
      "commit",
      "--quiet",
      "--allow-empty",
      "-m",
      message,
    );
    return (await this.git("rev-parse", "HEAD")).trim();
  }

  // What the branch changed against the base branch, file by file with how
  // much ("src/a.ts | 12 +++--"); empty when it cannot be told.
  async changes(): Promise<string> {
    try {
      return (
        await this.git("diff", "--stat", `${this.settings.baseBranch}...HEAD`)
      ).trim();
    } catch {
      return "";
    }
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

  // Shares the copy's branch with the team: pushed to origin as it is, never
  // over a teammate's work (no force). Plain words for why it could not be,
  // or null when it was.
  async pushBranch(branch: string): Promise<string | null> {
    if (!(await this.succeeds("remote", "get-url", "origin")))
      return "the project has no origin to share it through";
    try {
      await this.gitWithoutHooks(
        "push",
        "--quiet",
        "origin",
        `HEAD:refs/heads/${branch}`,
      );
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return message.replace(/^git .*? failed: /, "");
    }
  }

  // Whether the copy carries on with its own branch of a card: it holds
  // everything GitHub's has, or GitHub has none and the copy was stopped on
  // it before its first push. When GitHub's went another way, the copy's own
  // commits are kept as <branch>-kept-<commit> before it is replaced.
  private async continuesLocally(
    branch: string,
    onGitHub: boolean,
  ): Promise<boolean> {
    if ((await this.git("branch", "--list", branch)).trim() === "")
      return false;
    const current = (await this.git("branch", "--show-current")).trim();
    if (!onGitHub) return current === branch;
    const tip = (await this.git("rev-parse", branch)).trim();
    const github = `origin/${branch}`;
    if (!(await this.succeeds("merge-base", "--is-ancestor", github, tip))) {
      const own = await this.git("rev-list", `${github}..${tip}`);
      if (own.trim() !== "")
        await this.git(
          "branch",
          "--force",
          `${branch}-kept-${tip.slice(0, 7)}`,
          tip,
        );
      return false;
    }
    if (current !== branch) {
      await this.git("checkout", "--quiet", "--force", branch);
      await this.git("clean", "--quiet", "-fd");
    }
    return true;
  }

  private async succeeds(...args: string[]): Promise<boolean> {
    try {
      await this.git(...args);
      return true;
    } catch {
      return false;
    }
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
    const settingsFiles = settingsIn(this.path);
    for (const file of settingsFiles.filter(leftOut))
      rmSync(join(this.path, file), { force: true });
    // A copy's own settings: from the project's examples, never the
    // owner's; a product's copy settings (copyEnv) come on top.
    for (const example of settingsFiles.filter(isExample)) {
      const own = join(this.path, example.slice(0, -EXAMPLE_END.length));
      if (!existsSync(own)) copyFileSync(join(this.path, example), own);
    }
  }

  private async succeedsWithoutHooks(...args: string[]): Promise<boolean> {
    try {
      await this.gitWithoutHooks(...args);
      return true;
    } catch {
      return false;
    }
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

// Stages everything in a copy but its own settings files (.env, .env.test
// …, made from the examples), which are never committed; changes to the examples are.
// Everything is added the plain way, which keeps to the project's
// .gitignore, and a settings file the project does not ignore is taken out
// again. (Leaving them out by name instead makes git refuse when the
// project ignores them already.)
export async function stageAllButSettings(folder: string): Promise<void> {
  const git = (...args: string[]) => run("git", ["-C", folder, ...args]);
  await git("add", "--all");
  const staged = (await git("diff", "--cached", "--name-only", "-z"))
    .split("\0")
    .filter(leftOut);
  if (staged.length > 0)
    await git("rm", "--cached", "--quiet", "--", ...staged);
}

// The settings files (.env, .env.*) anywhere in a copy but in installed
// packages and git's own folder, as paths inside it. (fs.globSync's "**"
// does not find them on every Node version: the folder is read instead.)
function settingsIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .map((path) => path.split(sep).join("/"))
    .filter(
      (path) =>
        /(^|\/)\.env(\.[\w.-]+)?$/.test(path) &&
        !/(^|\/)(node_modules|\.git)\//.test(path),
    );
}
