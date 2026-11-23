// The branch a project's work goes into: its base branch. Where a code host
// is at hand (the extension in the `code` slot), its baseBranch() says it;
// otherwise git does, one way everywhere: what origin's HEAD points to
// (set when the project was cloned), else the default branch the remote
// itself names (`git ls-remote --symref origin HEAD`), and "main" only when
// neither answers (no remote, or one that cannot be reached).

import { execFile } from "node:child_process";
import { promisify } from "node:util";

// Git's answer to a command, or null when it failed.
export type GitAnswer = (args: string[]) => Promise<string | null>;

// Used when nothing else says it.
const LAST_RESORT = "main";

// Git is given at most this long (asking the remote can hang offline).
const REMOTE_WAIT_MS = 8000;

export async function baseBranchFrom(git: GitAnswer): Promise<string> {
  const head = await git([
    "symbolic-ref",
    "--short",
    "refs/remotes/origin/HEAD",
  ]);
  const local = head?.trim().replace(/^origin\//, "");
  if (local) return local;
  const remote = await git(["ls-remote", "--symref", "origin", "HEAD"]);
  const named = /^ref: refs\/heads\/(\S+)\s+HEAD$/m.exec(remote ?? "")?.[1];
  return named ?? LAST_RESORT;
}

// What the remote said, per project, asked once while the factory runs.
const remoteSaid = new Map<string, Promise<string | null>>();

// The project's base branch, from git.
export async function baseBranchOf(project: string): Promise<string> {
  const git = gitIn(project);
  return await baseBranchFrom((args) => {
    if (args[0] !== "ls-remote") return git(args);
    const said = remoteSaid.get(project) ?? git(args);
    remoteSaid.set(project, said);
    return said;
  });
}

// The project's base branch: the code host's when there is one and it
// answers, otherwise from git.
export async function baseBranchFor(
  project: string,
  host: { baseBranch: () => Promise<string> } | null,
): Promise<string> {
  if (host) {
    const named = await host.baseBranch().catch(() => "");
    if (named) return named;
  }
  return await baseBranchOf(project);
}

const exec = promisify(execFile);

// Git in the project, never waiting for a password prompt nobody sees, and
// stopped when it takes too long.
function gitIn(project: string): GitAnswer {
  return async (args) => {
    try {
      const { stdout } = await exec("git", ["-C", project, ...args], {
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        timeout: REMOTE_WAIT_MS,
      });
      return stdout;
    } catch {
      return null;
    }
  };
}
