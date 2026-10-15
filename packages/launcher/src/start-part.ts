// Starting one part, step by step: wait for what it depends on, check its
// settings files, notice a copy already running, prepare it, start its
// program and wait until it answers.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { addressOf, envOf, type Part, portOf } from "@software-factory/core";

import type { Light, NewProblem, PartLight } from "./part-light.ts";
import { answers, portTaken } from "./probe.ts";
import { Program } from "./programs.ts";
import { isFresh, packagesNeeded } from "./readiness.ts";

type Step = NonNullable<Part["prepare"]>[number];

const DEFAULT_START_SECONDS = 60;
// A part with neither a health address nor a port counts as running once it
// has kept running this long.
const SETTLE_MS = 1500;

// What starting a part needs from the launcher.
export type Starter = {
  root: string;
  parts: Part[];
  lightOf(id: string): PartLight;
  start(id: string): Promise<void>;
  set(inner: PartLight, light: Light, step: string | null): void;
  fail(inner: PartLight, problem: NewProblem): void;
  reset(inner: PartLight): void;
  programEnded(part: Part, program: Program): void;
};

export async function startPart(s: Starter, part: Part): Promise<void> {
  const inner = s.lightOf(part.id);
  if (inner.light === "running" || inner.light === "none") return;
  inner.stopping = false;
  inner.problem = null;

  if (!(await dependenciesRun(s, part, inner))) return;
  if (settingsMissing(s, part, inner)) return;
  if (await alreadyAnswers(s, part, inner)) return;
  const run = commandOf(s, part, inner);
  if (!run) return;

  s.set(inner, "starting", null);
  if (!(await prepared(s, part, inner))) return;
  launch(s, part, inner, run);
  if (!(await answersInTime(s, part, inner))) return;
  inner.outside = false;
  s.set(inner, "running", null);
}

// The program that starts the part; none for a part the factory only
// checks, which then shows that it is not running.
function commandOf(s: Starter, part: Part, inner: PartLight): string[] | null {
  if (part.start !== "never" && part.run) return part.run;
  s.fail(inner, {
    title: part.help?.title ?? `${part.name} isn't running`,
    text: part.help?.text ?? "Start it, then press Try again.",
  });
  return null;
}

export function folderOf(root: string, part: Part, step?: Step): string {
  return resolve(root, part.folder ?? ".", step?.folder ?? ".");
}

async function dependenciesRun(
  s: Starter,
  part: Part,
  inner: PartLight,
): Promise<boolean> {
  const dependencies = part.dependsOn.map((id) => partById(s.parts, id));
  if (dependencies.length === 0) return true;
  s.set(inner, "starting", `Waiting for ${names(dependencies)}`);
  await Promise.all(dependencies.map((d) => s.start(d.id)));
  const missing = dependencies.find((d) => s.lightOf(d.id).light !== "running");
  if (!missing) return true;
  s.fail(inner, {
    title: `${part.name} is waiting for ${missing.name}`,
    text: `${missing.name} has to run first. Look at it, then press Try again.`,
  });
  return false;
}

function settingsMissing(s: Starter, part: Part, inner: PartLight): boolean {
  const file = (part.needs ?? []).find((f) => !existsSync(resolve(s.root, f)));
  if (file === undefined) return false;
  s.fail(inner, {
    title: `The settings file ${file} is missing`,
    text: `${part.name} needs it. Make it (its README explains the values), then press Try again.`,
  });
  return true;
}

// True when the part needs no starting: it already answers (started outside
// the factory), or its address is taken by another program (a problem).
async function alreadyAnswers(
  s: Starter,
  part: Part,
  inner: PartLight,
): Promise<boolean> {
  const address = addressOf(part, s.parts, s.root);
  if (part.health && address && (await answers(address + part.health))) {
    inner.outside = Boolean(part.run);
    s.set(inner, "running", null);
    return true;
  }
  const port = portOf(part, s.parts, s.root);
  if (part.run && port && (await portTaken(port))) {
    s.fail(inner, {
      title: `Address ${String(port)} is used by another program`,
      text: `${part.name} needs it. Close the other program (perhaps an older window), then press Try again.`,
    });
    return true;
  }
  return false;
}

// Runs the part's preparation steps in order. False when one failed or the
// part was stopped meanwhile.
async function prepared(
  s: Starter,
  part: Part,
  inner: PartLight,
): Promise<boolean> {
  for (const step of part.prepare ?? []) {
    const ok = await prepareStep(s, part, step);
    if (!ok || stopped(inner)) return false;
  }
  return true;
}

async function prepareStep(
  s: Starter,
  part: Part,
  step: Step,
): Promise<boolean> {
  const inner = s.lightOf(part.id);
  const folder = folderOf(s.root, part, step);
  let command = step.run;
  if (step.packages) {
    const needed = packagesNeeded(folder);
    if (!needed) return true;
    command = ["npm", needed, "--no-audit", "--no-fund"];
  }
  if (step.unlessFresh && isFresh(folder, step.unlessFresh)) return true;
  if (!command) return true;
  s.set(inner, "starting", step.label);
  const program = new Program(command, { cwd: folder, env: part.env });
  inner.program = program;
  const code = await program.finished();
  inner.program = null;
  if (inner.stopping) return false;
  if (code === 0) return true;
  s.fail(inner, {
    title: `"${step.label}" didn't work for ${part.name}`,
    text: part.help?.text ?? "Look at the technical details below.",
    details: program.log,
  });
  return false;
}

function launch(
  s: Starter,
  part: Part,
  inner: PartLight,
  command: string[],
): void {
  const program = new Program(command, {
    cwd: folderOf(s.root, part),
    env: envOf(part, s.parts, s.root),
  });
  inner.program = program;
  void program.finished().then(() => {
    s.programEnded(part, program);
  });
  s.set(inner, "starting", "Starting");
}

// Waits until the part answers: its health address, else its port, else it
// keeps running a moment. False when it stopped, was stopped, or did not
// answer in time (then it shows a problem).
async function answersInTime(
  s: Starter,
  part: Part,
  inner: PartLight,
): Promise<boolean> {
  const ready = readyCheck(s, part);
  const seconds = part.startSeconds ?? DEFAULT_START_SECONDS;
  const until = Date.now() + seconds * 1000;
  while (!(await ready())) {
    if (gaveUp(inner)) return false;
    if (Date.now() > until) {
      await inner.program?.stop();
      inner.program = null;
      s.fail(inner, {
        title: `${part.name} did not answer within ${String(seconds)} second${seconds === 1 ? "" : "s"}`,
        text:
          part.help?.text ??
          "It may be stuck. Look at the technical details, then press Try again.",
      });
      return false;
    }
    await sleep(300);
  }
  return !gaveUp(inner);
}

function readyCheck(s: Starter, part: Part): () => Promise<boolean> {
  const address = addressOf(part, s.parts, s.root);
  if (part.health && address)
    return () => answers(address + (part.health ?? "/"));
  const port = portOf(part, s.parts, s.root);
  if (port) return () => portTaken(port);
  const since = Date.now();
  return async () => Date.now() - since >= SETTLE_MS;
}

// Read through a function: the part may be stopped while a step awaits.
function stopped(inner: PartLight): boolean {
  return inner.stopping;
}

function gaveUp(inner: PartLight): boolean {
  return inner.stopping || !inner.program?.running;
}

export function partById(parts: Part[], id: string): Part {
  const part = parts.find((p) => p.id === id);
  if (!part) throw new Error(`There is no part "${id}".`);
  return part;
}

function names(parts: Part[]): string {
  return parts.map((p) => p.name).join(" and ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}
