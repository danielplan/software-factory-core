// GitHub as the code host, when the GitHub board fills the `code` slot:
// its pull requests and releases, where a file on a branch is shown, and
// whether the project's copy pushes to the board's repository at all.

import { run } from "@software-factory/core";

import type { CodeHost } from "../../code-host.ts";
import type { Cli } from "../../github-cli.ts";
import { githubPullRequests } from "./pull-requests.ts";
import { githubReleases } from "./releases.ts";

const PICTURE = /\.(png|jpe?g|gif|webp|svg)$/i;

export function githubCodeHost(cli: Cli, repository: string): CodeHost {
  const pullRequests = githubPullRequests(cli, repository);
  return {
    ...pullRequests,
    releases: githubReleases(cli, repository, pullRequests.baseBranch),
    name: "GitHub",
    originProblem: (folder) => githubOriginProblem(folder, repository),
    fileLink: (branch, path) =>
      `https://github.com/${repository}/blob/${branch}/${path}${PICTURE.test(path) ? "?raw=true" : ""}`,
  };
}

// The repository the copy pushes to is not the board's (a fork, or the one
// the project was cloned from, say), so the branch is pushed there and
// GitHub never has it. Null when origin is that repository. Read as written,
// before git's insteadOf.
export async function githubOriginProblem(
  folder: string,
  repository: string,
): Promise<string | null> {
  const url = (
    await run("git", [
      "-C",
      folder,
      "config",
      "--get",
      "remote.origin.url",
    ]).catch(() => "")
  ).trim();
  const named = /github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?\/?$/i.exec(url)?.[1];
  if (named?.toLowerCase() === repository.toLowerCase()) return null;
  const where = url ? "`" + url + "`" : "no origin";
  return `The builder's copy pushes to ${where}, not to ${repository} on GitHub, so its branch and pull request would never reach the board. Point the project's origin at GitHub (\`git remote set-url origin https://github.com/${repository}.git\` in the project; its copies share it), then answer here or move the card back to To do.`;
}
