// software-factory prototype …: a card's prototype, or an exploration's
// prototype of an option, in its own copy of the project's code (copies.ts), so the owner's
// folder, its branch and its data are never touched. The core makes the copy
// and keeps track of it; what running the prototype means (servers,
// database, made-up data) is the project's own and is named in the company
// file's `prototype` commands.

import { spawnSync, type StdioOptions } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import { type Company, findFactory } from "@software-factory/core";

import { baseBranchOf } from "../base-branch.ts";
import { Refused } from "../refused.ts";
import {
  cardCopy,
  companyOf,
  git,
  homeOf,
  NO_START,
  type PrototypeCopy,
  shellWord,
  versionCopy,
  versionWorkspace,
} from "./copies.ts";

export const PROTOTYPE_USAGE = `software-factory prototype <number> [options]
                                             start (or restart) the card's prototype in its own
                                             copy of the code; the options go to the project's
                                             start command
software-factory prototype <exploration> <option> [options]
                                             the same for an exploration's prototype (X-1 b)
software-factory prototype <number> --stop   stop it (the copy stays); also <exploration> <option> --stop
software-factory prototype <number> --remove stop it and delete the copy (the branch stays)
software-factory prototype list              the prototypes and where their code is`;

type Out = (line: string) => void;

// Runs one prototype command; its exit code. `stdio` is what the project's
// commands print to: the terminal, unless a test captures it.
export async function prototypeCommand(
  args: string[],
  from = process.cwd(),
  out: Out = (line) => {
    process.stdout.write(`${line}\n`);
  },
  stdio: StdioOptions = "inherit",
): Promise<number> {
  try {
    const root = findFactory(from);
    if (!root)
      throw new Refused("There is no factory here: run it in a project.");
    const [first] = args;
    if (first === undefined || first === "help") {
      out(PROTOTYPE_USAGE);
      return 0;
    }
    const project = dirname(root);
    if (first === "list") {
      list(project, out);
      return 0;
    }
    const { copy, rest } = copyAsked(root, args);
    const context = { project, company: companyOf(root), copy, out, stdio };
    if (rest[0] === "--stop") return stop(context);
    if (rest[0] === "--remove") return remove(context);
    return await start(context, rest);
  } catch (error) {
    out(problemOf(error));
    return 1;
  }
}

type Context = {
  project: string;
  company: Company;
  copy: PrototypeCopy;
  out: Out;
  stdio: StdioOptions;
};

// A card by its number (#7 or 7), or an exploration's prototype by the
// exploration and the option (X-1 b, on proto/X-1-b); the words after them.
function copyAsked(root: string, [first = "", ...rest]: string[]) {
  const project = dirname(root);
  if (/^#?\d+$/.test(first) && Number(first.replace("#", "")) > 0)
    return { copy: cardCopy(project, Number(first.replace("#", ""))), rest };
  const [key, ...more] = rest;
  if (!/^X-\d+$/.test(first) || key === undefined || !/^[a-z]$/i.test(key))
    throw new Refused(
      `“${first}” is not a card number, nor an exploration with an option.\n\n${PROTOTYPE_USAGE}`,
    );
  const branch = `proto/${first}-${key.toLowerCase()}`;
  return {
    copy: versionCopy(project, first, key.toUpperCase(), branch),
    rest: more,
  };
}

function list(project: string, out: Out): void {
  const home = homeOf(project);
  const lines = existsSync(home)
    ? readdirSync(home)
        .toSorted((a, b) => a.localeCompare(b))
        .flatMap((name) => linesFor(home, name))
    : [];
  out(lines.length > 0 ? lines.join("\n") : "No prototypes.");
}

// A card's copy (issue-<n>), or each version's copy in an idea's folder.
function linesFor(home: string, name: string): string[] {
  if (/^issue-\d+$/.test(name))
    return [`#${name.slice(6)}  factory/${name}  ${join(home, name)}`];
  const folder = join(home, name);
  if (!statSync(folder).isDirectory()) return [];
  return readdirSync(folder)
    .toSorted((a, b) => a.localeCompare(b))
    .map(
      (key) =>
        `${name} ${key.toUpperCase()}  factory/${name}/${key}  ${join(folder, key)}`,
    );
}

// Makes a card's copy when it is not there: the card's branch when it
// exists, otherwise a new one from the project's base branch.
async function ensureCardCopy({ project, copy, out }: Context): Promise<void> {
  if (existsSync(copy.folder)) return;
  mkdirSync(dirname(copy.folder), { recursive: true });
  const known = git(project, ["branch", "--list", copy.branch]).trim() !== "";
  if (known) {
    out(`Copying the branch ${copy.branch} to ${copy.folder}`);
    git(project, ["worktree", "add", copy.folder, copy.branch]);
  } else {
    const base = await baseBranchOf(project);
    out(`A new branch ${copy.branch} from ${base}, copied to ${copy.folder}`);
    git(project, ["worktree", "add", "-b", copy.branch, copy.folder, base]);
  }
}

async function start(context: Context, options: string[]): Promise<number> {
  const { company, copy, out, project } = context;
  if (copy.env.FACTORY_CARD) await ensureCardCopy(context);
  else if (!existsSync(copy.folder)) {
    out(`Copying ${copy.name} to ${copy.folder}, on ${copy.branch}`);
    await versionWorkspace(project, copy);
  }
  if (!company.prototype) {
    out(`The copy is ready at ${copy.folder}. ${NO_START}`);
    return 0;
  }
  return runIn(context, company.prototype.start, options);
}

function stop(context: Context): number {
  const { company, copy, out } = context;
  if (!existsSync(copy.folder)) {
    out(`${capital(copy.name)} has no prototype copy.`);
    return 0;
  }
  if (!company.prototype?.stop) {
    out(
      'There is no stop command in factory.json ("prototype": { "stop": "…" }).',
    );
    return 0;
  }
  return runIn(context, company.prototype.stop, []);
}

function remove(context: Context): number {
  const { project, company, copy, out } = context;
  if (!existsSync(copy.folder)) {
    out(`${capital(copy.name)} has no prototype copy.`);
    return 0;
  }
  for (const command of [company.prototype?.stop, company.prototype?.remove])
    if (command) {
      const code = runIn(context, command, []);
      if (code !== 0) return code;
    }
  git(project, ["worktree", "remove", "--force", copy.folder]);
  out(`Removed ${copy.name}'s copy. The branch ${copy.branch} stays.`);
  return 0;
}

// A project command, in the copy, knowing which card or version and where.
function runIn(
  { copy, stdio }: Context,
  command: string,
  options: string[],
): number {
  const result = spawnSync([command, ...options.map(shellWord)].join(" "), {
    cwd: copy.folder,
    shell: true,
    stdio,
    env: { ...process.env, ...copy.env },
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function capital(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function problemOf(error: unknown): string {
  if (error instanceof Refused) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  return `Something went wrong: ${message}`;
}
