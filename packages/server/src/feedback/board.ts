// The public feedback board: a GitHub repository just for feedback, beside
// the core's own (github:owner/software-factory-core →
// owner/software-factory-feedback). Anyone with a GitHub account sends from
// their factory with their own sign-in (the GitHub CLI's, as for the
// factory's board); each post is an issue there. Where a post stands comes
// from the issue: no label yet is "sent", the label `seen` or `planned`,
// and a closed issue is "done".
//
// What this person sent is kept on this computer, in the personal settings
// folder (never in git), so the page can follow each post.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { Cli } from "../extensions/github/github.ts";
import { Refused } from "../refused.ts";

export const KINDS = ["bug", "wish"] as const;
export type Kind = (typeof KINDS)[number];
export const STATES = ["sent", "seen", "planned", "done"] as const;
export type State = (typeof STATES)[number];

export type Post = {
  number: number;
  kind: Kind;
  title: string;
  body: string;
  thumbs: number;
  state: State;
  // When it was posted, as an ISO time.
  at: string;
  url: string;
  // Who posted it (a GitHub login).
  by: string;
};

// What this person sent, or gave a 👍 to, and when.
// With the post as it was then, shown until the board lists it again.
export type Sent = { number: number; at: string; own: boolean; post?: Post };

// The board's repository for a core's release source.
export function boardOf(source: string): string {
  const owner = source.replace(/^github:/, "").split("/")[0] ?? "";
  return `${owner}/software-factory-feedback`;
}

type Issue = {
  number: number;
  title: string;
  body: string | null;
  state: string;
  created_at: string;
  html_url: string;
  user?: { login?: string } | null;
  labels: ({ name: string } | string)[];
  reactions?: { "+1"?: number };
  pull_request?: unknown;
};

function stateOf(issue: Issue): State {
  if (issue.state === "closed") return "done";
  const labels = issue.labels.map((one) =>
    typeof one === "string" ? one : one.name,
  );
  if (labels.includes("planned")) return "planned";
  if (labels.includes("seen")) return "seen";
  return "sent";
}

function postOf(issue: Issue): Post {
  const labels = issue.labels.map((one) =>
    typeof one === "string" ? one : one.name,
  );
  return {
    number: issue.number,
    kind: labels.includes("bug") ? "bug" : "wish",
    title: issue.title,
    body: issue.body ?? "",
    thumbs: issue.reactions?.["+1"] ?? 0,
    state: stateOf(issue),
    at: issue.created_at,
    url: issue.html_url,
    by: issue.user?.login ?? "",
  };
}

// How long the board's posts are kept before they are read again.
const FRESH_MS = 60_000;

export class FeedbackBoard {
  private readonly cli: Cli;
  readonly repository: string;
  private readonly file: string;
  private read: { at: number; posts: Post[] } | null = null;

  constructor(cli: Cli, repository: string, file: string) {
    this.cli = cli;
    this.repository = repository;
    this.file = file;
  }

  // Who is signed in to GitHub, if anyone.
  async login(): Promise<string | null> {
    const ran = await this.cli
      .run(["api", "user", "--jq", ".login"])
      .catch(() => null);
    return ran?.code === 0 ? ran.out.trim() || null : null;
  }

  // The posts on the board, newest first (none while nobody is signed in or
  // the board is not there), read again after a minute.
  async posts(now = Date.now()): Promise<Post[]> {
    if (this.read && now - this.read.at < FRESH_MS) return this.read.posts;
    const ran = await this.cli
      .run([
        "api",
        `repos/${this.repository}/issues?state=all&per_page=100`,
        "--jq",
        "[.[]]",
      ])
      .catch(() => null);
    if (ran?.code !== 0) return this.read?.posts ?? [];
    const issues = JSON.parse(ran.out || "[]") as Issue[];
    const posts = issues.filter((one) => !one.pull_request).map(postOf);
    this.read = { at: now, posts };
    return posts;
  }

  sent(): Sent[] {
    if (!existsSync(this.file)) return [];
    try {
      const kept: unknown = JSON.parse(readFileSync(this.file, "utf8"));
      return Array.isArray(kept) ? (kept as Sent[]) : [];
    } catch {
      return [];
    }
  }

  private remember(one: Sent): void {
    if (this.sent().some((there) => there.number === one.number)) return;
    mkdirSync(dirname(this.file), { recursive: true });
    writeFileSync(
      this.file,
      `${JSON.stringify([one, ...this.sent()], null, 2)}\n`,
    );
  }

  // A new post, with the person's own sign-in.
  async send(kind: Kind, title: string, body: string): Promise<Post> {
    const ran = await this.cli.run([
      "api",
      "--method",
      "POST",
      `repos/${this.repository}/issues`,
      "-f",
      `title=${title}`,
      "-f",
      `body=${body}`,
      "-f",
      `labels[]=${kind}`,
    ]);
    if (ran.code !== 0) throw new Refused(problemOf(ran.err));
    const post = postOf(JSON.parse(ran.out) as Issue);
    this.remember({ number: post.number, at: post.at, own: true, post });
    this.read = null;
    return post;
  }

  // A 👍 on a post already there, followed from now on.
  async thumb(number: number): Promise<void> {
    const ran = await this.cli.run([
      "api",
      "--method",
      "POST",
      `repos/${this.repository}/issues/${String(number)}/reactions`,
      "-f",
      "content=+1",
    ]);
    if (ran.code !== 0) throw new Refused(problemOf(ran.err));
    this.remember({ number, at: new Date().toISOString(), own: false });
    this.read = null;
  }
}

function problemOf(err: string): string {
  if (/404|not found/i.test(err))
    return "The feedback board is not there yet: the makers have to create it first.";
  if (/auth|login|401|403/i.test(err))
    return "GitHub did not accept the sign-in: sign in again and try once more.";
  return err.trim() || "GitHub did not answer.";
}
