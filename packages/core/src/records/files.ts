// Where a factory keeps its records: `kobble.db` in its folder, a local
// database that never goes into git (it is named in the folder's
// .gitignore as soon as it is made). A factory may also have a seed,
// `kobble-seed.json`, with records to start from: an empty database is
// filled from it (the example company has one; real projects start empty).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { messageOf } from "../products/product.ts";
import { checkRecords } from "./check.ts";
import { type Records, recordsSchema } from "./schemas.ts";
import { RecordsRefused, RecordStore } from "./store.ts";

export const RECORDS_FILE = "kobble.db";
export const SEED_FILE = "kobble-seed.json";
// The line in the factory's .gitignore that keeps the database (and the
// files SQLite keeps beside it) out of git.
export const IGNORED_RECORDS = "kobble.db*";

// The records of the factory in root: its database, made when there is none
// and filled from its seed while empty.
export function openRecords(root: string): RecordStore {
  keepOutOfGit(root);
  const store = RecordStore.open(join(root, RECORDS_FILE));
  const seed = join(root, SEED_FILE);
  try {
    if (store.isEmpty() && existsSync(seed)) store.fill(readSeed(seed));
  } catch (error) {
    store.close();
    throw error instanceof RecordsRefused
      ? new RecordsRefused(error.problems.map((p) => `${SEED_FILE}: ${p}`))
      : error;
  }
  return store;
}

// The records a seed file holds; one that does not fit is refused, with why.
export function readSeed(file: string): Records {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new RecordsRefused([`it cannot be read: ${messageOf(error)}`]);
  }
  const parsed = recordsSchema.safeParse(data);
  if (!parsed.success)
    throw new RecordsRefused([
      `it does not fit: ${z.prettifyError(parsed.error)}`,
    ]);
  return parsed.data;
}

// What `software-factory check` looks at: the factory's database and its
// seed, each where there is one (nothing is made). Each problem starts with
// the file it is in.
export function checkRecordsIn(root: string): {
  checked: string[];
  problems: string[];
} {
  const checked: string[] = [];
  const problems: string[] = [];
  const look = (name: string, records: () => Records) => {
    if (!existsSync(join(root, name))) return;
    checked.push(name);
    try {
      problems.push(...checkRecords(records()).map((p) => `${name}: ${p}`));
    } catch (error) {
      const said =
        error instanceof RecordsRefused ? error.problems : [messageOf(error)];
      problems.push(...said.map((p) => `${name}: ${p}`));
    }
  };
  look(RECORDS_FILE, () => {
    const store = RecordStore.open(join(root, RECORDS_FILE), true);
    try {
      return store.all();
    } finally {
      store.close();
    }
  });
  look(SEED_FILE, () => readSeed(join(root, SEED_FILE)));
  return { checked, problems };
}

// The factory's .gitignore names the database, once.
function keepOutOfGit(root: string): void {
  const file = join(root, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (text.split(/\r?\n/).some((line) => line.trim() === IGNORED_RECORDS))
    return;
  const before = text === "" || text.endsWith("\n") ? text : `${text}\n`;
  writeFileSync(file, `${before}${IGNORED_RECORDS}\n`);
}
