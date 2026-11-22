// Where a factory's branches and pull requests go: the code host. It comes
// from the extension that fills the `code` slot (where the code lives), so
// the builder, the card panel and Resolve never name a host. GitHub is the
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
