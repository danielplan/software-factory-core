// The checks before a pull request: the factory itself runs the verify
// command of every product the branch changed, in the working copy (with
// `npm ci` first where packages are missing), instead of taking the agent's
// word for it. A failure is written down for the agent's one round of
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

export type Check = { name: string; folder: string; command: string };
export type CheckResult = Check & { ok: boolean; output: string };
export type Shell = (
  cwd: string,
  command: string,
) => Promise<{ ok: boolean; output: string }>;
export type CheckOutcome = { passed: boolean; report: string };

const HOUR = 60 * 60_000;
const TAIL = 60;

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
    const inside = relative(copy, product.folder).split(sep).join("/");
    const touched = changed.some(
      (file) => inside === "" || file.startsWith(`${inside}/`),
    );
    const command = product.commands.verify;
    return touched && command
      ? [{ name: product.name, folder: product.folder, command }]
      : [];
  });
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
      const tail = r.output.trimEnd().split("\n").slice(-TAIL).join("\n");
      return `### ${r.name}: \`${r.command}\` failed\n\n\`\`\`\n${tail}\n\`\`\``;
    })
    .join("\n\n");
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

// Added to the pull request when the checks still fail.
export function failedChecksSection(report: string): string {
  return `## The checks still fail

The factory ran the checks on this computer, gave the failure to the builder once to fix, and ran them again. These still fail, so this pull request is a **draft**: do not merge it yet.

${report}`;
}
