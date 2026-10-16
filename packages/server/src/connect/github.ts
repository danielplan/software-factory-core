// Connecting the factory to a GitHub board through the GitHub CLI on this
// computer: whether it is here and signed in, signing in in the browser
// (the owner types the one-time code it shows), the owner's repositories
// and boards to pick from, and a check that the chosen board answers.

import { spawn } from "node:child_process";

import { Refused } from "../refused.ts";
import { GH } from "./programs.ts";

// One run of the GitHub CLI: its exit code and what it wrote.
export type Ran = { code: number; out: string; err: string };

// Running the CLI: to its end, or as it goes (sign-in, which waits for the
// browser), with its lines and a way to answer it.
export type Cli = {
  run: (args: string[]) => Promise<Ran>;
  start: (
    args: string[],
    onLine: (line: string) => void,
  ) => { answer: (text: string) => void; done: Promise<number> };
};

export type GitHubStatus = {
  // The GitHub CLI is on this computer.
  cli: boolean;
  // Who is signed in, if anyone.
  login: string | null;
  // Signing in: the code to type in the browser, or why it stopped.
  signingIn: { code: string | null; problem: string | null } | null;
};

const CODE = /one-time code:\s*([A-Z0-9]{4}-[A-Z0-9]{4})/;

export class GitHub {
  private cli: Cli;
  private changed: () => void;
  private signingIn: GitHubStatus["signingIn"] = null;

  constructor(cli: Cli, changed: () => void) {
    this.cli = cli;
    this.changed = changed;
  }

  async status(): Promise<GitHubStatus> {
    const version = await this.cli.run(["--version"]).catch(() => null);
    if (version?.code !== 0)
      return { cli: false, login: null, signingIn: this.signingIn };
    const user = await this.cli.run(["api", "user", "--jq", ".login"]);
    const login = user.code === 0 ? user.out.trim() || null : null;
    return { cli: true, login, signingIn: this.signingIn };
  }

  // Signing in in the browser, with the right to read boards; signed in
  // already without it, the right is added the same way.
  signIn(more = false): void {
    if (this.signingIn && !this.signingIn.problem) return;
    this.signingIn = { code: null, problem: null };
    const args = more
      ? ["auth", "refresh", "--hostname", "github.com", "--scopes", "project"]
      : [
          "auth",
          "login",
          "--hostname",
          "github.com",
          "--git-protocol",
          "https",
          "--web",
          "--scopes",
          "project",
        ];
    const run = this.cli.start(args, (line) => {
      const code = CODE.exec(line)?.[1];
      if (code && this.signingIn) {
        this.signingIn = { ...this.signingIn, code };
        // It waits for Enter before it opens the browser.
        run.answer("\n");
        this.changed();
      }
    });
    void run.done.then((exit) => {
      this.signingIn =
        exit === 0
          ? null
          : { code: null, problem: "Signing in did not finish. Try again." };
      this.changed();
    });
  }

  // The repositories the owner can reach, as owner/name.
  async repositories(): Promise<string[]> {
    const ran = await this.cli.run([
      "api",
      "user/repos?per_page=100&sort=pushed",
      "--jq",
      ".[].full_name",
    ]);
    if (ran.code !== 0) throw new Refused(problemOf(ran));
    return ran.out.split("\n").filter(Boolean);
  }

  // The boards (projects) of a repository's owner.
  async boards(owner: string): Promise<{ number: number; title: string }[]> {
    const ran = await this.cli.run([
      "project",
      "list",
      "--owner",
      owner,
      "--format",
      "json",
    ]);
    if (ran.code !== 0) throw new Refused(problemOf(ran));
    const { projects } = JSON.parse(ran.out) as {
      projects: { number: number; title: string }[];
    };
    return projects.map(({ number, title }) => ({ number, title }));
  }

  // The chosen board answers: its title and its columns.
  async check(repository: string, board: number): Promise<string> {
    const owner = repository.split("/")[0] ?? "";
    const view = await this.cli.run([
      "project",
      "view",
      String(board),
      "--owner",
      owner,
      "--format",
      "json",
    ]);
    if (view.code !== 0) throw new Refused(problemOf(view));
    const { title } = JSON.parse(view.out) as { title: string };
    const fields = await this.cli.run([
      "project",
      "field-list",
      String(board),
      "--owner",
      owner,
      "--format",
      "json",
    ]);
    const status = (
      JSON.parse(fields.code === 0 ? fields.out : '{"fields":[]}') as {
        fields: { name: string; options?: unknown[] }[];
      }
    ).fields.find((field) => field.name === "Status");
    const columns = status?.options?.length ?? 0;
    return `Connected to “${title}”, ${String(columns)} columns.`;
  }
}

// What went wrong, in plain words; a missing right to read boards says so.
function problemOf(ran: Ran): string {
  if (/scope|read:project/i.test(ran.err))
    return "GitHub has not allowed the factory to read boards yet: allow it, then try again.";
  return ran.err.trim() || "GitHub did not answer.";
}

// The GitHub CLI on this computer.
export function realCli(): Cli {
  return {
    run: (args) =>
      new Promise((resolve, reject) => {
        const child = spawn(GH, args, { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        let err = "";
        child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
        child.on("error", reject);
        child.on("close", (code) => {
          resolve({ code: code ?? 1, out, err });
        });
      }),
    start: (args, onLine) => {
      const child = spawn(GH, args, { stdio: ["pipe", "pipe", "pipe"] });
      const read = (chunk: Buffer) => {
        for (const line of chunk.toString().split("\n")) onLine(line);
      };
      child.stdout.on("data", read);
      child.stderr.on("data", read);
      return {
        answer: (text) => child.stdin.write(text),
        done: new Promise((resolve) => {
          child.on("error", () => {
            resolve(1);
          });
          child.on("close", (code) => {
            resolve(code ?? 1);
          });
        }),
      };
    },
  };
}
