// Reading and writing Kobble's JSON files (store.ts): a file that cannot be
// read is refused with its name and why; a write goes to a file beside it
// first and is then renamed into place, so a file is never left
// half-written.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { messageOf } from "../products/product.ts";

// A record that does not fit, or a file that cannot be read, with why.
export class KobbleRefused extends Error {}

export function readJson(file: string, name: string): unknown {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new KobbleRefused(`${name} cannot be read: ${messageOf(error)}`);
  }
}

export function writeAtomically(file: string, data: unknown): void {
  writeText(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeText(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${String(process.pid)}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, file);
}
