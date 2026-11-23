// A repository's releases on GitHub, through the GitHub CLI: its tags, its
// releases with their notes, the pull requests merged into the main branch
// since a tag, and making a release (a tag on the main branch's latest
// commit and a GitHub release on it).

import type {
  CodeReleases,
  HostRelease,
  MergedRequest,
} from "../../code-host.ts";
import { branchOf } from "../../cards/cards.ts";
import { answer, type Cli } from "../../github-cli.ts";

type Json = <T>(args: string[]) => Promise<T>;
type Gh = (args: string[]) => Promise<string>;

const MOST = 300;

export function githubReleases(
  cli: Cli,
  repository: string,
  baseBranch: () => Promise<string>,
): CodeReleases {
  const gh: Gh = async (args) => answer(await cli.run(args));
  const json: Json = async <T>(args: string[]) =>
    JSON.parse(await gh(args)) as T;
  return {
    tags: async (start) => {
      const refs = await gh([
        "api",
        `repos/${repository}/git/matching-refs/tags/${start}`,
        "--paginate",
        "--jq",
        ".[].ref",
      ]);
      return lines(refs).map((ref) => ref.replace(/^refs\/tags\//, ""));
    },
    list: () => listed(json, repository),
    mergedSince: async (tag) =>
      mergedSince(gh, json, repository, await baseBranch(), tag),
    create: async ({ tag, title, body }) => {
      await gh([
        "release",
        "create",
        tag,
        "--repo",
        repository,
        "--target",
        await baseBranch(),
        "--title",
        title,
        "--notes",
        body,
      ]);
    },
  };
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

async function listed(json: Json, repository: string): Promise<HostRelease[]> {
  const found = await json<
    {
      tag_name: string;
      body: string | null;
      published_at: string | null;
      html_url: string;
      draft: boolean;
    }[]
  >(["api", `repos/${repository}/releases?per_page=100`]);
  return found.map((release) => ({
    tag: release.tag_name,
    date: release.published_at ?? "",
    url: release.html_url,
    body: release.body ?? "",
    draft: release.draft,
  }));
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
  gh: Gh,
  json: Json,
  repository: string,
  base: string,
  tag: string | null,
): Promise<MergedRequest[]> {
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
  const after = tag
    ? new Set(
        lines(
          await gh([
            "api",
            `repos/${repository}/compare/${tag}...${base}`,
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
  const cards = await cardLabels(json, repository);
  return wanted.map((one) => ({
    number: one.number,
    title: one.title,
    url: one.url,
    body: one.body,
    labels: [
      ...one.labels.map((label) => label.name),
      ...(cards.get(one.headRefName) ?? []),
    ],
  }));
}

// The labels of each card (an issue), by the branch it is built on.
async function cardLabels(
  json: Json,
  repository: string,
): Promise<Map<string, string[]>> {
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
  return new Map(
    issues.map((issue) => [
      branchOf(issue.number),
      issue.labels.map((label) => label.name),
    ]),
  );
}
