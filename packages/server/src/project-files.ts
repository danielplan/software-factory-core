// The project files the core owns, written the same way in every factory,
// by setup and again by every `software-factory upgrade`, so all are on the
// same page. What the team wants differently goes in a declared place of
// its own, never by the core leaving an edited value alone (decision 0015):
//
// - `lefthook.yml`, the git hooks, whole: before a commit, the format check
//   of each product with a staged file and the knowledge base's checks when
//   a page changed; before a push, the verify command of each product the
//   pushed commits change. It ends by taking in the team's own hooks,
//   `factory/hooks.yml`, which the core makes from a short template when it
//   is missing and never changes after.
// - In `package.json` (made when missing): the core pinned (pin-core.ts),
//   lefthook at the core's version, and the scripts in CORE_SCRIPTS. Every
//   other key and script is the team's.
//
// A `lefthook.yml` the core did not write is kept in the factory folder
// before it is replaced, and the scripts replaced are said with their old
// values, so the owner brings over what is the team's own.

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FACTORY_FOLDER, idFrom } from "@software-factory/core";

import { pinCore } from "./pin-core.ts";

export const HOOKS_FILE = "lefthook.yml";
export const TEAM_HOOKS = `${FACTORY_FOLDER}/hooks.yml`;

// lefthook's version: the one the core itself uses.
const LEFTHOOK = "2.2.1";

// The scripts the core owns in the project's package.json.
export const CORE_SCRIPTS: Record<string, string> = {
  prepare: "lefthook install",
  verify: "software-factory verify && npm run check:docs",
  "check:docs": "software-factory check-docs",
  "check:format": "software-factory check-format",
};

// How the core's lefthook.yml starts: a file without it is not the core's.
const GENERATED = "# Written by the software factory's core";

export const CORE_HOOKS = `${GENERATED}: \`software-factory upgrade\` writes it
# again, so do not change it here. The team's own hooks go in
# factory/hooks.yml, which it takes in at the end.
#
# The project's git hooks, run by lefthook (https://lefthook.dev): \`npm
# install\` at the top of the project sets them up. They check only what
# changed, with the factory's own commands. Never skip them with --no-verify.

pre-commit:
  jobs:
    # The format check of each product with a staged file.
    - name: format
      run: npx --no-install software-factory check-format {staged_files}
    # The knowledge base's checks, when a page changed.
    - name: docs
      glob: "**/*.md"
      run: npx --no-install software-factory check-docs

pre-push:
  jobs:
    # The verify command of each product the pushed commits change (git
    # says which commits on the standard input).
    - name: verify
      run: npx --no-install software-factory verify --pushed
      use_stdin: true

# The team's own hooks.
extends:
  - ${TEAM_HOOKS}
`;

function teamHooks(kept: string | null): string {
  const before = kept
    ? `#
# The project's hooks from before the core wrote lefthook.yml are kept in
# ${kept}: bring over the ones that are the team's own. The format, docs
# and verify hooks are the core's now.
`
    : "";
  return `# The team's own git hooks, taken in by the factory's lefthook.yml (which
# the core writes). The core never changes this file. Hooks are written as
# lefthook's settings (https://lefthook.dev), for example:
#
# pre-commit:
#   jobs:
#     - name: our check
#       run: npm run our-check
${before}`;
}

export type ProjectFiles = {
  done: string[];
  // The scripts whose value the core replaced, with their old value.
  replaced: Record<string, string>;
  // Where a lefthook.yml the core did not write was kept; null when none.
  kept: string | null;
};

// The core's project files written in the project, for the core at
// `version`; a new package.json is named after the project.
export function writeProjectFiles(
  project: string,
  name: string,
  version: string,
): ProjectFiles {
  const kept = keepOwnHooks(project, version);
  const done: string[] = [];
  const team = join(project, TEAM_HOOKS);
  if (!existsSync(team)) {
    writeFileSync(team, teamHooks(kept));
    done.push(`Made ${TEAM_HOOKS} for the team's own git hooks.`);
  }
  if (readText(join(project, HOOKS_FILE)) !== CORE_HOOKS) {
    writeFileSync(join(project, HOOKS_FILE), CORE_HOOKS);
    done.push(`Wrote ${HOOKS_FILE}, the factory's git hooks.`);
  }
  const replaced = writePackage(project, name, done);
  if (pinCore(project, version))
    done.push(
      `Pinned the core in package.json at release ${version}: run npm install.`,
    );
  return { done, replaced, kept };
}

// A lefthook.yml the core did not write, moved into the factory folder;
// where it went, or null.
function keepOwnHooks(project: string, version: string): string | null {
  const text = readText(join(project, HOOKS_FILE));
  if (text === null || text.startsWith(GENERATED)) return null;
  const [major, minor] = version.split(".");
  const kept = `${FACTORY_FOLDER}/hooks-before-${major ?? ""}.${minor ?? ""}.yml`;
  renameSync(join(project, HOOKS_FILE), join(project, kept));
  return kept;
}

// The core's keys in package.json, made when missing; the scripts it
// replaced, with their old values.
function writePackage(
  project: string,
  name: string,
  done: string[],
): Record<string, string> {
  const file = join(project, "package.json");
  const text = readText(file);
  const data = text === null ? newPackage(name) : packageData(text);
  const { scripts, replaced } = withCoreScripts(data.scripts ?? {});
  const devDependencies = {
    ...(data.devDependencies ?? {}),
    lefthook: LEFTHOOK,
  };
  const written = { ...data, scripts, devDependencies };
  // Written with the indentation the file already has.
  const indent = /\n([ \t]+)"/.exec(text ?? "")?.[1] ?? "  ";
  const next = `${JSON.stringify(written, null, indent)}\n`;
  if (next === text) return replaced;
  writeFileSync(file, next);
  if (text === null) ignoreInstalled(project);
  done.push(
    text === null
      ? "Made package.json with the factory's scripts and lefthook."
      : "Wrote the factory's scripts and lefthook in package.json.",
  );
  return replaced;
}

// The scripts with the core's own, and the ones replaced (their old value).
function withCoreScripts(given: Record<string, string>) {
  const scripts = { ...given };
  const replaced: Record<string, string> = {};
  for (const [script, command] of Object.entries(CORE_SCRIPTS)) {
    const old = scripts[script];
    if (old !== undefined && old !== command) replaced[script] = old;
    scripts[script] = command;
  }
  return { scripts, replaced };
}

type PackageData = {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
} & Record<string, unknown>;

function newPackage(name: string): PackageData {
  return {
    name: idFrom(name),
    private: true,
    description:
      "The project's own checks and its software factory; each product keeps its own package.json.",
    type: "module",
  };
}

function packageData(text: string): PackageData {
  return JSON.parse(text) as PackageData;
}

// The packages installed at the top of a new project stay out of git.
function ignoreInstalled(project: string): void {
  const file = join(project, ".gitignore");
  const text = readText(file) ?? "";
  if (/^\/?node_modules\/?$/m.test(text)) return;
  const before = text === "" || text.endsWith("\n") ? "" : "\n";
  writeFileSync(file, `${text}${before}node_modules/\n`);
}

// The core's project files written, said for the owner: what was done, and
// what is left to them (hooks kept from before, scripts replaced).
export function projectFilesSaid(
  project: string,
  name: string,
  version: string,
): { done: string[]; left: string[] } {
  const { done, replaced, kept } = writeProjectFiles(project, name, version);
  const left: string[] = [];
  if (kept)
    left.push(
      `The project's own lefthook.yml is kept as ${kept} (not taken in): bring over the hooks that are the team's own into ${TEAM_HOOKS}; the format, docs and verify hooks are the core's now.`,
    );
  const scripts = Object.entries(replaced).map(
    ([script, old]) => `"${script}" (it was "${old}")`,
  );
  if (scripts.length > 0)
    left.push(
      `The core's scripts in package.json replaced ${scripts.join(", ")}: give a script of the team's own that is still needed a name of its own.`,
    );
  return { done, left };
}

// The core's project files that were changed by hand: each said in a line.
// A file that is not there is not checked (setup and upgrade write it).
export function editedProjectFiles(project: string): string[] {
  const edited: string[] = [];
  const hooks = readText(join(project, HOOKS_FILE));
  if (hooks !== null && hooks.replaceAll("\r\n", "\n") !== CORE_HOOKS)
    edited.push(
      `${HOOKS_FILE} is not the one the core writes: software-factory upgrade writes it again. Put the team's own hooks in ${TEAM_HOOKS}.`,
    );
  const text = readText(join(project, "package.json"));
  if (text === null) return edited;
  let data: PackageData;
  try {
    data = packageData(text);
  } catch {
    return [...edited, "package.json cannot be read as JSON."];
  }
  for (const [script, command] of Object.entries(CORE_SCRIPTS))
    if (data.scripts?.[script] !== command)
      edited.push(
        `package.json: the script "${script}" is the core's ("${command}"): software-factory upgrade writes it again. Give the team's own a name of its own.`,
      );
  if (data.devDependencies?.lefthook !== LEFTHOOK)
    edited.push(
      `package.json: lefthook is the core's, at ${LEFTHOOK}: software-factory upgrade writes it again.`,
    );
  return edited;
}

function readText(file: string): string | null {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}
