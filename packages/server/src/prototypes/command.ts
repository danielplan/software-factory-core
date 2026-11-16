// software-factory prototype …: a card's prototype, or a version of an
// idea, in its own copy of the project's code (copies.ts), so the owner's
// folder, its branch and its data are never touched. The core makes the copy
// and keeps track of it; what running the prototype means (servers,
// database, made-up data) is the project's own and is named in the company
// file's `prototype` commands.

import { spawnSync, type StdioOptions } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  type Company,
  findFactory,
  RECORDS_FILE,
  RecordStore,
  versionKey,
} from "@software-factory/core";

import { Refused } from "../refused.ts";
import {
  cardCopy,
  companyOf,
  git,
  homeOf,
  mainBranch,
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
software-factory prototype <idea> <version> [options]
                                             the same for a version of an idea (prototype mode)
software-factory prototype <number> --stop   stop it (the copy stays); also <idea> <version> --stop
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

// A card by its number (#7 or 7), or a version by its idea and key; the
// words after them.
function copyAsked(root: string, [first = "", ...rest]: string[]) {
  const project = dirname(root);
  if (/^#?\d+$/.test(first) && Number(first.replace("#", "")) > 0)
    return { copy: cardCopy(project, Number(first.replace("#", ""))), rest };
  const [key, ...more] = rest;
  if (key === undefined || key.startsWith("-"))
    throw new Refused(
      `“${first}” is not a card number, nor an idea with a version.\n\n${PROTOTYPE_USAGE}`,
    );
  const version = recordedVersion(root, first, key);
  return {
    copy: versionCopy(project, first, version.key, version.branch),
    rest: more,
  };
}

// The version as the records know it (with its branch); without records
// yet, the one named.
function recordedVersion(root: string, idea: string, key: string) {
  const file = join(root, RECORDS_FILE);
  if (!existsSync(file)) return { key: key.toUpperCase(), branch: undefined };
  const store = RecordStore.open(file, true);
  try {
    const found =
      store.get("versions", versionKey(idea, key)) ??
      store.get("versions", versionKey(idea, key.toUpperCase()));
    if (!found)
      throw new Refused(
        `There is no version ${key} of the idea “${idea}”: make one in prototype mode first.`,
      );
    return found;
  } finally {
    store.close();
  }
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
// exists, otherwise a new one from the project's main branch.
function ensureCardCopy({ project, copy, out }: Context): void {
  if (existsSync(copy.folder)) return;
  mkdirSync(dirname(copy.folder), { recursive: true });
  const known = git(project, ["branch", "--list", copy.branch]).trim() !== "";
  if (known) {
    out(`Copying the branch ${copy.branch} to ${copy.folder}`);
    git(project, ["worktree", "add", copy.folder, copy.branch]);
  } else {
    const base = mainBranch(project);
    out(`A new branch ${copy.branch} from ${base}, copied to ${copy.folder}`);
    git(project, ["worktree", "add", "-b", copy.branch, copy.folder, base]);
  }
}

async function start(context: Context, options: string[]): Promise<number> {
  const { company, copy, out, project } = context;
  if (copy.env.FACTORY_CARD) ensureCardCopy(context);
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
