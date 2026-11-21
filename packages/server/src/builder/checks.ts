// The checks before a pull request: the factory itself runs the verify
// command of every product the branch changed, in the working copy (with
// `npm ci` first where packages are missing), instead of taking the agent's
// word for it, and checks that each such product uses only the libraries
// its kit's rules and its blueprint name. A failure is written down for the agent's one round of
// fixing and, if it stays, for the pull request.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  type Available,
  FACTORY_FOLDER,
  loadFactory,
  run,
} from "@software-factory/core";
import { unlistedPackagesOf } from "@software-factory/kits";

export type Check = { name: string; folder: string; command: string };
export type CheckResult = Check & { ok: boolean; output: string };
export type Shell = (
  cwd: string,
  command: string,
) => Promise<{ ok: boolean; output: string }>;
export type CheckOutcome = { passed: boolean; report: string };

// Rounds of fixing while a check is red, before the owner is asked.
export const FIX_ROUNDS = 3;

// The checks, and up to FIX_ROUNDS rounds of fixing while any is red (the
// builder fixes every red check, also one that was red before its change);
// it stops early when the builder says only the owner can unblock it.
export async function checkWithFixes(options: {
  copy: string;
  available: Available;
  base: string;
  shell?: Shell;
  onActivity: (line: string) => void;
  fix: (
    report: string,
    round: number,
  ) => Promise<{ status: string; text: string }>;
}): Promise<CheckOutcome & { blocked: string | null }> {
  const { copy, available, base, onActivity } = options;
  const check = async () => {
    const changed = await changedFiles(copy, base);
    const ran = await runChecks(
      copy,
      checksFor(copy, available, changed),
      options.shell,
      (c) => {
        onActivity(`Checking ${c.name}: ${c.command}`);
      },
    );
    return withLibraries(ran, libraryReport(copy, available, changed));
  };
  let checked = await check();
  for (let round = 1; !checked.passed && round <= FIX_ROUNDS; round++) {
    const answer = await options.fix(checked.report, round);
    if (answer.status === "blocked")
      return { ...checked, blocked: answer.text };
    checked = await check();
  }
  return { ...checked, blocked: null };
}

const HOUR = 60 * 60_000;
const TAIL = 30;
const FAILED_LINES = 40;
// A line that tells what failed, in the usual test and check tools' words.
const FAILING = /✘|✖|×|\bfail(ed|ing|s|ure)?\b|\berror\b|\bnot ok\b/i;

// The checks for what the branch changed: each product with a changed file
// in its folder and a verify command.
export function checksFor(
  copy: string,
  available: Available,
  changed: string[],
): Check[] {
  const loaded = loadFactory(join(copy, FACTORY_FOLDER), available);
  if ("problem" in loaded) return [];
  return loaded.products.flatMap((product) => {
    const command = product.commands.verify;
    return touches(copy, product.folder, changed) && command
      ? [{ name: product.name, folder: product.folder, command }]
      : [];
  });
}

// The touched products that depend on a package neither their kit's
// libraries table nor their blueprint's names, said as a failed check; ""
// when there is none.
export function libraryReport(
  copy: string,
  available: Available,
  changed: string[],
): string {
  const loaded = loadFactory(join(copy, FACTORY_FOLDER), available);
  if ("problem" in loaded) return "";
  return loaded.products
    .filter((product) => touches(copy, product.folder, changed))
    .flatMap((product) => {
      const kit = loaded.kits.find((one) => one.id === product.kit);
      const missing = unlistedPackagesOf(product.folder, kit?.rules ?? []);
      if (missing.length === 0) return [];
      const list = missing.map((name) => "- `" + name + "`").join("\n");
      return [
        `### ${product.name}: libraries no table names\n\n${list}\n\nEach job has one library, named in the libraries table of the kit's conventions (\`npx software-factory rules ${product.id}\`). Use the library the table names for that job instead; when the job is not there, add a row with the job, the library and why to the product's \`BLUEPRINT.md\` under \`## Libraries\` (the same columns).`,
      ];
    })
    .join("\n\n");
}

function withLibraries(ran: CheckOutcome, libraries: string): CheckOutcome {
  if (libraries === "") return ran;
  return {
    passed: false,
    report: [ran.report, libraries].filter((part) => part !== "").join("\n\n"),
  };
}

function touches(copy: string, folder: string, changed: string[]): boolean {
  const inside = relative(copy, folder).split(sep).join("/");
  return changed.some((file) => inside === "" || file.startsWith(`${inside}/`));
}

export async function changedFiles(
  copy: string,
  base: string,
): Promise<string[]> {
  const out = await run("git", [
    "-C",
    copy,
    "diff",
    "--name-only",
    `origin/${base}...HEAD`,
  ]);
  return out.split("\n").filter((line) => line.trim() !== "");
}

// Runs the checks, each after its packages are there; never throws.
export async function runChecks(
  copy: string,
  checks: Check[],
  shell: Shell = realShell,
  onStep: (check: Check) => void = () => undefined,
): Promise<CheckOutcome> {
  const results: CheckResult[] = [];
  for (const check of checks) {
    onStep(check);
    const install = await installIfMissing(copy, check.folder, shell);
    results.push({
      ...check,
      ...(install.ok ? await shell(check.folder, check.command) : install),
    });
  }
  const failed = results.filter((r) => !r.ok);
  return { passed: failed.length === 0, report: reportOf(failed) };
}

// `npm ci` in the folder with the lock file nearest to the product
// (its own, else the copy's top), when its packages are missing.
async function installIfMissing(copy: string, folder: string, shell: Shell) {
  const home = [folder, copy].find((f) =>
    existsSync(join(f, "package-lock.json")),
  );
  if (!home || existsSync(join(home, "node_modules")))
    return { ok: true, output: "" };
  return await shell(home, "npm ci");
}

function reportOf(failed: CheckResult[]): string {
  return failed
    .map((r) => {
      return `### ${r.name}: \`${r.command}\` failed\n\n\`\`\`\n${shownOutput(r.output)}\n\`\`\``;
    })
    .join("\n\n");
}

// What a failed check said: the lines that name what failed, then its last
// lines (a test tool's summary), without saying a line twice.
export function shownOutput(output: string): string {
  const lines = output.trimEnd().split("\n");
  const tail = lines.slice(-TAIL);
  const failing = lines
    .slice(0, -TAIL)
    .filter((line) => FAILING.test(line))
    .slice(0, FAILED_LINES);
  return [...failing, ...(failing.length > 0 ? ["…"] : []), ...tail].join("\n");
}

// A command in a folder, through the system's shell, with plain output.
export const realShell: Shell = (cwd, command) =>
  new Promise((resolve) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", CI: "1" },
    });
    let output = "";
    // A time limit of its own: Node's `timeout` option keeps its timer when
    // the command cannot even start.
    const limit = setTimeout(() => {
      output += "\nStopped after an hour.";
      child.kill();
    }, HOUR);
    const done = (ok: boolean, more = "") => {
      clearTimeout(limit);
      resolve({ ok, output: output + more });
    };
    const collect = (chunk: Buffer) => {
      output += chunk.toString();
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.on("error", (error) => {
      done(false, `\n${error.message}`);
    });
    child.on("close", (code) => {
      done(code === 0);
    });
  });

// Added to the pull request when the checks fail again after review
// comments: it is a draft until they pass.
export function failedChecksSection(report: string): string {
  return `## The checks fail

The factory ran the checks on this computer and gave the failures to the builder to fix, three rounds. These still fail, so this pull request is a **draft** until they pass: do not merge it yet.

${report}`;
}
