// Which board the factory's work is on, besides its own: the GitHub board
// or Jira project connected, the label that marks the factory's work, and
// which of its columns each stage is. Kept in the factory's board.json,
// with the factory, since none of it is secret (Jira's token is in the
// settings, on this computer only).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { STAGES } from "../api.ts";

export const BOARD_FILE = "board.json";

const stages = z.object(
  Object.fromEntries(STAGES.map((stage) => [stage, z.string()])) as Record<
    (typeof STAGES)[number],
    z.ZodString
  >,
);

export const boardSchema = z.object({
  github: z
    .object({
      repository: z.string(),
      board: z.number().int(),
      label: z.string(),
      stages,
    })
    .optional(),
  jira: z
    .object({
      site: z.string(),
      email: z.string(),
      project: z.string(),
      label: z.string(),
      stages,
    })
    .optional(),
});

export type Board = z.infer<typeof boardSchema>;

// The board file, or none connected yet (or one that does not fit).
export function readBoard(root: string): Board {
  const file = join(root, BOARD_FILE);
  if (!existsSync(file)) return {};
  const read = boardSchema.safeParse(
    JSON.parse(readFileSync(file, "utf8")) as unknown,
  );
  return read.success ? read.data : {};
}

export function saveBoard(root: string, board: Board): void {
  writeFileSync(
    join(root, BOARD_FILE),
    `${JSON.stringify(boardSchema.parse(board), null, 2)}\n`,
  );
}
