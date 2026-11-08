// The builder's pull requests on GitHub, through the GitHub CLI: found by
// their branch (open, merged or closed), opened (as a draft when the checks
// fail), changed, and everything said on one (its comments, its reviews
// and the comments on its lines), oldest first.

import { answer } from "../add-ons/github/board-setup.ts";
import type { Cli } from "../add-ons/github/github.ts";
import type { Message } from "./decide.ts";

export type PullRequest = {
  number: number;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  draft: boolean;
};

export type Opening = {
  branch: string;
  base: string;
  title: string;
  body: string;
  draft: boolean;
};

export type PullRequests = {
  baseBranch: () => Promise<string>;
  find: (branch: string) => Promise<PullRequest | null>;
  open: (opening: Opening) => Promise<PullRequest>;
  // A new description, and ready for review or back to a draft.
  update: (number: number, body: string, draft: boolean) => Promise<void>;
  comment: (number: number, text: string) => Promise<void>;
  said: (number: number) => Promise<Message[]>;
};

type Json = <T>(args: string[]) => Promise<T>;
type Author = { login: string } | null;

export function githubPullRequests(cli: Cli, repository: string): PullRequests {
  const gh = async (args: string[]) => answer(await cli.run(args));
  const json: Json = async <T>(args: string[]) =>
    JSON.parse(await gh(args)) as T;
  const repo = ["--repo", repository];
  const find = async (branch: string) => {
    const found = await json<(PullRequest & { isDraft: boolean })[]>([
      "pr",
      "list",
      ...repo,
      "--head",
      branch,
      "--state",
      "all",
      "--json",
      "number,url,state,isDraft",
    ]);
    const first = found[0];
    return first
      ? {
          number: first.number,
          url: first.url,
          state: first.state,
          draft: first.isDraft,
        }
      : null;
  };
  return {
    baseBranch: () => defaultBranch(gh, repository),
    find,
    open: async (opening) => {
      await gh(createArgs(repo, opening));
      const made = await find(opening.branch);
      if (!made) throw new Error("GitHub did not show the new pull request.");
      return made;
    },
    update: async (number, body, draft) => {
      await gh(["pr", "edit", String(number), ...repo, "--body", body]);
      await gh([
        "pr",
        "ready",
        String(number),
        ...repo,
        ...(draft ? ["--undo"] : []),
      ]).catch(() => "");
    },
    comment: async (number, text) => {
      await gh(["pr", "comment", String(number), ...repo, "--body", text]);
    },
    said: (number) => saidOn(json, repository, number),
  };
}

async function defaultBranch(
  gh: (args: string[]) => Promise<string>,
  repository: string,
): Promise<string> {
  const name = await gh([
    "repo",
    "view",
    repository,
    "--json",
    "defaultBranchRef",
    "--jq",
    ".defaultBranchRef.name",
  ]);
  return name.trim() || "main";
}

function createArgs(repo: string[], opening: Opening): string[] {
  return [
    "pr",
    "create",
    ...repo,
    "--head",
    opening.branch,
    "--base",
    opening.base,
    "--title",
    opening.title,
    "--body",
    opening.body,
    ...(opening.draft ? ["--draft"] : []),
  ];
}

// Everything said on a pull request, oldest first.
async function saidOn(
  json: Json,
  repository: string,
  number: number,
): Promise<Message[]> {
  const viewed = await json<{
    comments: { author: Author; body: string; createdAt: string }[];
    reviews: { author: Author; body: string; submittedAt: string }[];
  }>([
    "pr",
    "view",
    String(number),
    "--repo",
    repository,
    "--json",
    "comments,reviews",
  ]);
  const lines = await json<
    { user: Author; body: string; created_at: string; path?: string }[]
  >(["api", `repos/${repository}/pulls/${String(number)}/comments`]);
  const message = (author: Author, body: string, at: string): Message => ({
    author: author?.login ?? "",
    body,
    at,
    where: "pull request",
  });
  return [
    ...viewed.comments.map((c) => message(c.author, c.body, c.createdAt)),
    ...viewed.reviews
      .filter((r) => r.body.trim() !== "")
      .map((r) => message(r.author, r.body, r.submittedAt)),
    ...lines.map((c) =>
      message(c.user, c.path ? `(${c.path}) ${c.body}` : c.body, c.created_at),
    ),
  ].sort((a, b) => a.at.localeCompare(b.at));
}
