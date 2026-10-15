// Makes the new products of a factory being set up (greenfield): each with
// its kit's starter commands, one product after the other, in the folder its
// code goes in. Each is a job the page shows while it works.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname } from "node:path";

import type { Kit } from "@software-factory/core";

import type { Job, SetupProduct } from "./api.ts";

const LOG_LINES = 12;

// True when every product was made.
export async function createProducts(
  products: SetupProduct[],
  kits: Kit[],
  show: (jobs: Job[]) => void,
): Promise<boolean> {
  const jobs: Job[] = products.map((product) => ({
    id: product.id,
    label: `Making ${product.name}`,
    state: "waiting",
    log: [],
  }));
  show(jobs);
  let all = true;
  for (const [index, product] of products.entries()) {
    const job = jobs[index];
    if (!job) continue;
    job.state = "working";
    show([...jobs]);
    const made = await createOne(product, kits, (line) => {
      job.log = [...job.log, line].slice(-LOG_LINES);
      show([...jobs]);
    });
    job.state = made ? "done" : "failed";
    all &&= made;
    show([...jobs]);
  }
  return all;
}

async function createOne(
  product: SetupProduct,
  kits: Kit[],
  log: (line: string) => void,
): Promise<boolean> {
  const kit = kits.find((k) => k.kind === product.kind);
  const steps = kit?.create?.(product.folder, product.name);
  if (!steps) {
    log(`No kit can make a ${product.kind}.`);
    return false;
  }
  if (existsSync(product.folder)) {
    log(`${product.folder} is there already: it is used as it is.`);
    return true;
  }
  const parent = dirname(product.folder);
  mkdirSync(parent, { recursive: true });
  for (const [command, ...args] of steps) {
    if (!command) continue;
    log(`${basename(command)} ${args.join(" ")}`);
    if (!(await runStep(command, args, parent, log))) return false;
  }
  return existsSync(product.folder);
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
