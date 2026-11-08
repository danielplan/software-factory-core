// software-factory prototype …: a card's prototype, in its own copy of the
// project's code, so the owner's folder, its branch and its data are never
// touched. The core makes the copy (a git worktree on the card's branch
// `factory/issue-<number>`, beside the project) and keeps track of it; what
// running the prototype means (servers, database, made-up data) is the
// project's own and is named in the company file's `prototype` commands.

import { spawnSync, type StdioOptions } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";

import { type Company, findFactory, readCompany } from "@software-factory/core";
import { GIT } from "@software-factory/knowledge-base";

import { Refused } from "../refused.ts";

export const PROTOTYPE_USAGE = `software-factory prototype <number> [options]
                                             start (or restart) the card's prototype in its own
                                             copy of the code; the options go to the project's
                                             start command
software-factory prototype <number> --stop   stop it (the copy stays)
software-factory prototype <number> --remove stop it and delete the copy (the branch stays)
software-factory prototype list              the prototypes and where their code is`;

type Out = (line: string) => void;

// Where a card's prototype lives and what it is called.
export type PrototypeCopy = {
  number: number;
  branch: string;
  folder: string;
};

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
    const [first, ...rest] = args;
    if (first === undefined || first === "help") {
      out(PROTOTYPE_USAGE);
      return 0;
    }
    const project = dirname(root);
    if (first === "list") {
      list(project, out);
      return 0;
    }
    const copy = copyOf(project, first);
    const company = companyOf(root);
    const context = { project, company, copy, out, stdio };
    if (rest[0] === "--stop") return stop(context);
    if (rest[0] === "--remove") return remove(context);
    return start(context, rest);
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

// The copies live next to the project, in `<project>-prototypes/`.
function homeOf(project: string): string {
  return join(dirname(project), `${basename(project)}-prototypes`);
}

function copyOf(project: string, word: string): PrototypeCopy {
  const number = Number(word.replace(/^#/, ""));
  if (!Number.isInteger(number) || number <= 0)
    throw new Refused(`“${word}” is not a card number.\n\n${PROTOTYPE_USAGE}`);
  return {
    number,
    branch: `factory/issue-${String(number)}`,
    folder: join(homeOf(project), `issue-${String(number)}`),
  };
}

function companyOf(root: string): Company {
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) throw new Refused(read.problem);
  return read.company;
}

function list(project: string, out: Out): void {
  const home = homeOf(project);
  const folders = existsSync(home)
    ? readdirSync(home).filter((name) => /^issue-\d+$/.test(name))
    : [];
  if (folders.length === 0) {
    out("No prototypes.");
    return;
  }
  for (const name of folders.toSorted((a, b) => a.localeCompare(b)))
    out(`#${name.slice(6)}  factory/${name}  ${join(home, name)}`);
}

// Makes the copy when it is not there: the card's branch when it exists,
// otherwise a new one from the project's main branch.
function ensureCopy({ project, copy, out }: Context): void {
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

function start(context: Context, options: string[]): number {
  const { company, copy, out } = context;
  ensureCopy(context);
  if (!company.prototype) {
    out(
      `The copy is ready at ${copy.folder}. Nothing starts in it: name the project's start command in factory.json ("prototype": { "start": "…" }).`,
    );
    return 0;
  }
  return runIn(context, company.prototype.start, options);
}

function stop(context: Context): number {
  const { company, copy, out } = context;
  if (!existsSync(copy.folder)) {
    out(`Card #${String(copy.number)} has no prototype copy.`);
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
    out(`Card #${String(copy.number)} has no prototype copy.`);
    return 0;
  }
  for (const command of [company.prototype?.stop, company.prototype?.remove])
    if (command) {
      const code = runIn(context, command, []);
      if (code !== 0) return code;
    }
  git(project, ["worktree", "remove", "--force", copy.folder]);
  out(
    `Removed card #${String(copy.number)}'s copy. The branch ${copy.branch} stays.`,
  );
  return 0;
}

// A project command, in the copy, knowing which card and where.
function runIn(
  { project, copy, stdio }: Context,
  command: string,
  options: string[],
): number {
  const result = spawnSync([command, ...options.map(shellWord)].join(" "), {
    cwd: copy.folder,
    shell: true,
    stdio,
    env: {
      ...process.env,
      FACTORY_CARD: String(copy.number),
      FACTORY_BRANCH: copy.branch,
      FACTORY_PROJECT: project,
      FACTORY_COPY: copy.folder,
    },
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

// One word for a shell, so an option with spaces or quotes stays one option.
function shellWord(word: string): string {
  return `'${word.replaceAll("'", "'\\''")}'`;
}

// The project's main branch: what origin calls its head, otherwise main.
function mainBranch(project: string): string {
  try {
    return git(project, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"])
      .trim()
      .replace(/^origin\//, "");
  } catch {
    return "main";
  }
}

function git(cwd: string, args: string[]): string {
  const result = spawnSync(GIT, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Refused(
      `git ${args.slice(0, 2).join(" ")} failed: ${(result.stderr || result.stdout).trim()}`,
    );
  return result.stdout;
}

function problemOf(error: unknown): string {
  if (error instanceof Refused) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  return `Something went wrong: ${message}`;
}
