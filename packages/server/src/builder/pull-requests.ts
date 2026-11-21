// The builder's pull requests on GitHub, through the GitHub CLI: found by
// their branch (open, merged or closed), opened (as a draft when the checks
// fail), changed, and everything said on one (its comments, its reviews
// and the comments on its lines), oldest first. The description shows the
// screenshots the branch adds.

import { existsSync } from "node:fs";
import { basename, extname, join } from "node:path";

import { answer } from "../add-ons/github/board-setup.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { branchOf } from "./branches.ts";
import { changedFiles } from "./checks.ts";
import { markComment } from "./protocol.ts";
import type { BoardCard, Message } from "./decide.ts";

const PICTURE = /\.(png|jpe?g|gif|webp)$/i;
const MOST_PICTURES = 12;

export type PullRequest = {
  number: number;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  draft: boolean;
  // GitHub says it clashes with the main branch (unknown counts as no).
  conflicting?: boolean;
};

// What the owner says on a card whose pull request clashes (Resolve), as
// the card goes back to To do: the builder takes it into In progress, brings
// in main and settles the clash on the same branch and pull request.
export const RESOLVE_ASK =
  "Please bring in the latest main and resolve the merge conflicts, keeping what both sides meant.";

export type Opening = {
  branch: string;
  base: string;
  title: string;
  body: string;
  draft: boolean;
};

export type PullRequests = {
  // owner/name on GitHub, where the description's pictures are shown from.
  repository?: string;
  baseBranch: () => Promise<string>;
  find: (branch: string) => Promise<PullRequest | null>;
  open: (opening: Opening) => Promise<PullRequest>;
  // A new description, and ready for review or back to a draft.
  // A new description (none: the description stays as it is) and whether
  // it is a draft.
  update: (
    number: number,
    body: string | null,
    draft: boolean,
  ) => Promise<void>;
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
    const found = await json<
      (PullRequest & { isDraft: boolean; mergeable?: string })[]
    >([
      "pr",
      "list",
      ...repo,
      "--head",
      branch,
      "--state",
      "all",
      "--json",
      "number,url,state,isDraft,mergeable",
    ]);
    const first = found[0];
    return first
      ? {
          number: first.number,
          url: first.url,
          state: first.state,
          draft: first.isDraft,
          conflicting: first.mergeable === "CONFLICTING",
        }
      : null;
  };
  return {
    repository,
    baseBranch: () => defaultBranch(gh, repository),
    find,
    open: async (opening) => {
      await gh(createArgs(repo, opening));
      const made = await find(opening.branch);
      if (!made) throw new Error("GitHub did not show the new pull request.");
      return made;
    },
    update: async (number, body, draft) => {
      if (body !== null)
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

// The pictures the branch adds (the screenshots of its run), at most a
// dozen: shown in the description, since a picture only named in it is one
// nobody opens.
async function picturesIn(copy: string, base: string): Promise<string[]> {
  return (await changedFiles(copy, base))
    .filter((file) => PICTURE.test(file) && existsSync(join(copy, file)))
    .slice(0, MOST_PICTURES);
}

// The description's pictures, each shown from the branch on GitHub.
export function picturesSection(
  pictures: string[],
  repository: string,
  branch: string,
): string {
  if (pictures.length === 0 || repository === "") return "";
  const shown = pictures.map(
    (file) =>
      `![${basename(file, extname(file))}](https://github.com/${repository}/blob/${branch}/${file}?raw=true)`,
  );
  return `\n\n## Screenshots\n\n${shown.join("\n\n")}`;
}

// Opens the card's pull request, or updates the one there is; its address.
export async function openOrUpdate(
  pullRequests: PullRequests,
  card: Pick<BoardCard, "number" | "title">,
  text: string,
  draft: boolean,
  at?: { build: () => Promise<{ path: string }> },
): Promise<string> {
  const branch = branchOf(card.number);
  const base = await pullRequests.baseBranch();
  const pictures = at ? await picturesIn((await at.build()).path, base) : [];
  const shown = picturesSection(
    pictures,
    pullRequests.repository ?? "",
    branch,
  );
  const body = `${text}${shown}\n\nCloses #${String(card.number)}.`;
  const found = await pullRequests.find(branch);
  // Built again (a clash resolved): the description stays about the card,
  // and what this run did is said on the pull request.
  if (found?.state === "OPEN") {
    await pullRequests.update(found.number, null, draft);
    await pullRequests.comment(
      found.number,
      markComment(`${text}${shown}`, draft ? "checks-failed" : "fixed"),
    );
    return found.url;
  }
  const made = await pullRequests.open({
    branch,
    base,
    title: card.title,
    body,
    draft,
  });
  return made.url;
}
