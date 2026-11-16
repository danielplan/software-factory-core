// The example company's records served by a factory server for the tests
// (stage.ts): its seed in the factory's folder, and ways to read what the
// server answers, press its buttons and wait for the kobold.

import { copyFileSync } from "node:fs";
import { join } from "node:path";

import { SEED_FILE } from "@software-factory/core";

import type { KoboldJob } from "../src/kobold/kobold.ts";
import type { VersionRun } from "../src/prototypes/mode.ts";
import type { RecordsView } from "../src/records/views.ts";
import type { stage } from "./stage.ts";

export const ACME_SEED = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "examples",
  "acme",
  "factory",
  SEED_FILE,
);

// What the server answers a button with, in these tests.
export type Said = {
  error: string;
  done: string;
  question: string;
  job: KoboldJob;
  source: { id: string };
  signal: { id: string };
  idea: { id: string };
  issue: number;
  url: string;
  run: VersionRun;
  version: { key: string };
};

export function acmeServed(staged: Awaited<ReturnType<typeof stage>>) {
  const root = staged.session.createCompany({ name: "Acme", about: "" });
  copyFileSync(ACME_SEED, join(root, SEED_FILE));
  const read = async <T>(path: string) =>
    (await (await fetch(`${staged.base}${path}`)).json()) as T;
  const send = async (path: string, body: unknown) => {
    const response = await staged.post(path, body);
    return { status: response.status, body: (await response.json()) as Said };
  };
  // The jobs once none of them works any more.
  const settled = async () => {
    for (;;) {
      const { jobs } = await read<{ jobs: KoboldJob[] }>(
        "/api/understand/kobold",
      );
      if (!jobs.some((job) => job.working)) return jobs;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  const records = async () => (await read<RecordsView>("/api/records")).records;
  const close = () => {
    staged.session.close();
    staged.server.close();
  };
  return { ...staged, root, read, send, settled, records, close };
}
