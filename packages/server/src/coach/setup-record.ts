// The setup conversation, kept in the project as `factory/setup.json` once
// something was said or drawn: what was said, the map, whether the factory
// is being built, and Claude Code's conversation to go on with. So setup
// carries on where it was after the factory is started again, and the
// project keeps a record of how its factory was set up.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";
import { z } from "zod";

export const SETUP_FILE = "setup.json";

const recordSchema = z.object({
  conversation: z.string(),
  phase: z.enum(["plan", "build"]),
  messages: z.array(
    z.object({ from: z.enum(["coach", "owner"]), text: z.string() }),
  ),
  // The map as the coach drew it (api.ts: Draft), kept as it was written.
  map: z.looseObject({
    cards: z.array(z.unknown()),
    links: z.array(z.unknown()),
  }),
});

export type SetupRecord = z.infer<typeof recordSchema>;

// The record of an earlier setup in this project; none, or one that does
// not fit, starts afresh.
export function readSetup(project: string): SetupRecord | null {
  const file = join(project, FACTORY_FOLDER, SETUP_FILE);
  if (!existsSync(file)) return null;
  try {
    const read = recordSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
    return read.success ? read.data : null;
  } catch {
    return null;
  }
}

export function saveSetup(project: string, record: SetupRecord): void {
  const folder = join(project, FACTORY_FOLDER);
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, SETUP_FILE),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}
