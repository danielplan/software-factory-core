// Work that takes a while (making a product with its starter, installing a
// tool), one job after the other, each shown with its last lines while it
// works.

import { spawn } from "node:child_process";
import { basename } from "node:path";

import type { Job } from "./api.ts";

const LOG_LINES = 12;

export type Work = {
  id: string;
  label: string;
  // True when it worked; what it prints goes to `log`.
  run: (log: (line: string) => void) => Promise<boolean>;
};

// True when every job worked.
export async function runJobs(
  work: Work[],
  show: (jobs: Job[]) => void,
): Promise<boolean> {
  const jobs: Job[] = work.map((w) => ({
    id: w.id,
    label: w.label,
    state: "waiting",
    log: [],
  }));
  show(jobs);
  let all = true;
  for (const [index, w] of work.entries()) {
    const job = jobs[index];
    if (!job) continue;
    job.state = "working";
    show([...jobs]);
    const worked = await w.run((line) => {
      job.log = [...job.log, line].slice(-LOG_LINES);
      show([...jobs]);
    });
    job.state = worked ? "done" : "failed";
    all &&= worked;
    show([...jobs]);
  }
  return all;
}

// Commands run one after the other in `cwd`, stopping at the first that
// fails.
export async function runSteps(
  steps: string[][],
  cwd: string,
  log: (line: string) => void,
): Promise<boolean> {
  for (const [command, ...args] of steps) {
    if (!command) continue;
    log(`${basename(command)} ${args.join(" ")}`);
    if (!(await runStep(command, args, cwd, log))) return false;
  }
  return true;
}

function runStep(
  command: string,
  args: string[],
  cwd: string,
  log: (line: string) => void,
): Promise<boolean> {
  return new Promise((resolve) => {
    const windows = process.platform === "win32";
    const child = spawn(command, args, {
      cwd,
      shell: windows,
      windowsHide: true,
      env: { ...process.env, CI: "1", npm_config_yes: "true" },
    });
    const lines = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/))
        if (line.trim()) log(line.trim());
    };
    child.stdout.on("data", lines);
    child.stderr.on("data", lines);
    child.on("error", (error) => {
      log(error.message);
      resolve(false);
    });
    child.on("close", (code) => {
      resolve(code === 0);
    });
  });
}
