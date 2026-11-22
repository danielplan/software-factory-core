// The GitHub CLI on this computer, which keeps its own sign-in: the core
// runs it for the public feedback board, and the extensions that work with
// GitHub (the GitHub board, Releases, the builder's signals) run it too.

import { spawn } from "node:child_process";

import { GH } from "./programs.ts";
import { Refused } from "./refused.ts";

// One run of the GitHub CLI: its exit code and what it wrote.
export type Ran = { code: number; out: string; err: string };

// Running the CLI: to its end, or as it goes (sign-in, which waits for the
// browser), with its lines and a way to answer it.
export type Cli = {
  run: (args: string[]) => Promise<Ran>;
  start: (
    args: string[],
    onLine: (line: string) => void,
  ) => {
    answer: (text: string) => void;
    done: Promise<number>;
    // Ends a program that keeps running (gh webhook forward).
    stop?: () => void;
  };
};

// What the CLI wrote, or, when it failed, why, refused in its words.
export function answer(ran: Ran): string {
  if (ran.code !== 0)
    throw new Refused(ran.err.trim() || "GitHub did not answer.");
  return ran.out;
}

// The owner of a repository named "owner/name".
export function ownerOf(repository: string): string {
  return repository.split("/")[0] ?? "";
}

// How long one answer from GitHub may take before the factory gives up on
// it, so a stuck network or sign-in never hangs a command.
const ANSWER_WITHIN = 60_000;

// The GitHub CLI on this computer.
export function realCli(within = ANSWER_WITHIN): Cli {
  return {
    run: (args) =>
      new Promise((resolve, reject) => {
        const child = spawn(GH, args, { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        let err = "";
        const late = setTimeout(() => {
          child.kill();
          err = `GitHub didn't answer within ${String(within / 1000)} seconds: check the connection and try again.`;
        }, within);
        child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
        child.on("error", (error) => {
          clearTimeout(late);
          reject(error);
        });
        child.on("close", (code) => {
          clearTimeout(late);
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
        stop: () => child.kill("SIGINT"),
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
