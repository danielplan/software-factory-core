// A product's releases on GitHub, through the GitHub CLI: the tags there
// are, the past releases with their notes, the pull requests merged into the
// main branch since a tag, and making a release (a tag on the main branch's
// latest commit and a GitHub release on it). Nothing is kept in the
// factory's files.

import { answer } from "../../github-cli.ts";
import type { Cli } from "../../github-cli.ts";
import { type CardType, typeOf } from "../../cards/cards.ts";
import { branchOf } from "../../cards/cards.ts";
import type { Merged } from "./notes.ts";
import { numberOfTag, tagOf } from "./numbers.ts";

// The why of a release made here, kept in its notes where a page can read
// it back (a comment, so GitHub does not show it).
const WHY = /^<!-- software-factory:why (".*") -->\n?/;

export type Past = {
  number: string;
  date: string;
  url: string;
  // The line saying why the number is the one it is, when it was made here.
  why: string | null;
  notes: string;
};

export type Releases = {
  baseBranch: () => Promise<string>;
  tags: () => Promise<string[]>;
  past: () => Promise<Past[]>;
  // Merged into the main branch after this release (all of them without).
  merged: (since: string | null) => Promise<Merged[]>;
  make: (number: string, why: string | null, notes: string) => Promise<void>;
};

type Json = <T>(args: string[]) => Promise<T>;

const MOST = 300;

export function githubReleases(cli: Cli, repository: string): Releases {
  const gh = async (args: string[]) => answer(await cli.run(args));
  const json: Json = async <T>(args: string[]) =>
    JSON.parse(await gh(args)) as T;
  const base = async () =>
    (
      await gh([
        "repo",
        "view",
        repository,
        "--json",
        "defaultBranchRef",
        "--jq",
        ".defaultBranchRef.name",
      ])
    ).trim() || "main";
  return {
    baseBranch: base,
    tags: async () => {
      const refs = await gh([
        "api",
        `repos/${repository}/git/matching-refs/tags/v`,
        "--paginate",
        "--jq",
        ".[].ref",
      ]);
      return lines(refs).map((ref) => ref.replace(/^refs\/tags\//, ""));
    },
    past: () => pastReleases(json, repository),
    merged: async (since) =>
      mergedSince(gh, json, repository, await base(), since),
    make: async (number, why, notes) => {
      await gh([
        "release",
        "create",
        tagOf(number),
        "--repo",
        repository,
        "--target",
        await base(),
        "--title",
        number,
        "--notes",
        (why ? `<!-- software-factory:why ${whyJson(why)} -->\n` : "") + notes,
      ]);
    },
  };
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

// JSON that can sit inside an HTML comment.
const whyJson = (why: string) =>
  JSON.stringify(why).replaceAll(">", "\\u003e").replaceAll("<", "\\u003c");

// The releases with a vX.Y.Z tag, newest first.
async function pastReleases(json: Json, repository: string): Promise<Past[]> {
  const found = await json<
    {
      tag_name: string;
      body: string | null;
      published_at: string | null;
      html_url: string;
      draft: boolean;
    }[]
  >(["api", `repos/${repository}/releases?per_page=100`]);
  return found.flatMap((release) => {
    const number = numberOfTag(release.tag_name);
    if (number === null || release.draft) return [];
    const body = release.body ?? "";
    const marker = WHY.exec(body);
    return [
      {
        number,
        date: release.published_at ?? "",
        url: release.html_url,
        why: marker ? (JSON.parse(marker[1] ?? '""') as string) : null,
        notes: body.replace(WHY, ""),
      },
    ];
  });
}

type PullRequest = {
  number: number;
  title: string;
  body: string;
  url: string;
  headRefName: string;
  mergeCommit: { oid: string } | null;
  labels: { name: string }[];
};

// The pull requests merged into the main branch after the tag: those whose
// merge commit is among the commits the tag lacks.
async function mergedSince(
  gh: (args: string[]) => Promise<string>,
  json: Json,
  repository: string,
  base: string,
  since: string | null,
): Promise<Merged[]> {
  const requests = await json<PullRequest[]>([
    "pr",
    "list",
    "--repo",
    repository,
    "--state",
    "merged",
    "--base",
    base,
    "--limit",
    String(MOST),
    "--json",
    "number,title,body,url,headRefName,mergeCommit,labels",
  ]);
  const after = since
    ? new Set(
        lines(
          await gh([
            "api",
            `repos/${repository}/compare/${tagOf(since)}...${base}`,
            "--paginate",
            "--jq",
            ".commits[].sha",
          ]),
        ),
      )
    : null;
  const wanted = requests
    .filter(
      (one) => !after || (one.mergeCommit && after.has(one.mergeCommit.oid)),
    )
    .sort((a, b) => a.number - b.number);
  if (wanted.length === 0) return [];
  const cards = await cardTypes(json, repository);
  return wanted.map((one) => ({
    number: one.number,
    title: one.title,
    url: one.url,
    body: one.body,
    type:
      typeOf(one.labels.map((label) => label.name)) ??
      cards.get(one.headRefName) ??
      null,
  }));
}

// The type of each card, by the branch it was built on.
async function cardTypes(
  json: Json,
  repository: string,
): Promise<Map<string, CardType>> {
  const issues = await json<{ number: number; labels: { name: string }[] }[]>([
    "issue",
    "list",
    "--repo",
    repository,
    "--state",
    "all",
    "--limit",
    String(MOST),
    "--json",
    "number,labels",
  ]);
  const types = new Map<string, CardType>();
  for (const issue of issues) {
    const type = typeOf(issue.labels.map((label) => label.name));
    if (type) types.set(branchOf(issue.number), type);
  }
  return types;
}
