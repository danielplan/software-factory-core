// Where a factory's branches and pull requests go: the code host. It comes
// from the extension that fills the `code` slot (where the code lives), so
// the builder, the card panel and Resolve never name a host. GitHub is the
// only one today; another one (GitLab) comes as an add-on that fills the
// slot and gives its own CodeHost.

import { join } from "node:path";

import {
  type Extension,
  readCompany,
  run,
  slotsOf,
} from "@software-factory/core";

import type { Cli } from "../add-ons/github/github.ts";
import { githubPullRequests, type PullRequests } from "./pull-requests.ts";

export type CodeHost = PullRequests & {
  // Its name, in plain words: "GitHub".
  name: string;
  // Why the copy's origin is not this host's repository, so its branch would
  // never reach it; null when it is.
  originProblem: (folder: string) => Promise<string | null>;
  // A file on a branch, as a link; a picture is shown as it is.
  fileLink: (branch: string, path: string) => string;
};

// A host's CodeHost for one repository ("owner/name" on GitHub).
export type CodeHostOf = (repository: string) => CodeHost;

const PICTURE = /\.(png|jpe?g|gif|webp|svg)$/i;

export function githubCodeHost(cli: Cli, repository: string): CodeHost {
  return {
    ...githubPullRequests(cli, repository),
    name: "GitHub",
    originProblem: (folder) => githubOriginProblem(folder, repository),
    fileLink: (branch, path) =>
      `https://github.com/${repository}/blob/${branch}/${path}${PICTURE.test(path) ? "?raw=true" : ""}`,
  };
}

// The code host of the extension in the factory's `code` slot, or why there
// is none to push to.
export function codeHostFor(
  root: string,
  extensions: Extension[],
  hosts: Readonly<Record<string, CodeHostOf>>,
  repository: string,
): CodeHost | { problem: string } {
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) return read;
  const inUse = slotsOf(extensions, read.company).find(
    (slot) => slot.slot === "code",
  )?.inUse;
  if (!inUse) return { problem: "Nothing says where the code lives yet." };
  const host = hosts[inUse];
  if (!host)
    return {
      problem: `The code lives with ${inUse}, where the builder cannot push yet.`,
    };
  return host(repository);
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
