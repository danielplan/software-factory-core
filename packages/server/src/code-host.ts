// Where a factory's branches, pull requests and releases go: the code host.
// It comes from the extension that fills the `code` slot (where the code
// lives), so the builder, the card panel, Resolve, Releases and the notes
// of Kobble's own releases never name a host. GitHub is the
// only one today; another one (GitLab) comes as an add-on that fills the
// slot and gives its own CodeHost.

import { join } from "node:path";

import { type Extension, readCompany, slotsOf } from "@software-factory/core";

export type PullRequest = {
  number: number;
  url: string;
  state: "OPEN" | "MERGED" | "CLOSED";
  draft: boolean;
  // GitHub says it clashes with the main branch (unknown counts as no).
  conflicting?: boolean;
};

// Something said on a card or on its pull request.
export type Message = {
  author: string;
  body: string;
  at: string;
  where: "card" | "pull request";
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

// A release on the code host: a tag and the notes on it.
export type HostRelease = {
  tag: string;
  // When it was published (an ISO time); empty for a draft.
  date: string;
  url: string;
  body: string;
  draft: boolean;
};

// A pull request merged into the main branch.
export type MergedRequest = {
  number: number;
  title: string;
  url: string;
  body: string;
  // Its own labels, then those of the card its branch was built for.
  labels: string[];
};

export type CodeReleases = {
  // The repository's tags that start with these letters ("v").
  tags: (start: string) => Promise<string[]>;
  // Its releases, newest first, drafts too.
  list: () => Promise<HostRelease[]>;
  // The pull requests merged into the main branch after this tag, oldest
  // first; all of them without a tag.
  mergedSince: (tag: string | null) => Promise<MergedRequest[]>;
  // A release: the tag on the main branch's latest commit, and the notes
  // on it.
  create: (release: {
    tag: string;
    title: string;
    body: string;
  }) => Promise<void>;
};

export type CodeHost = PullRequests & {
  releases: CodeReleases;
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

// The code hosts, by the extension that fills the `code` slot with one.
export type CodeHosts = Readonly<Record<string, CodeHostOf>>;

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
