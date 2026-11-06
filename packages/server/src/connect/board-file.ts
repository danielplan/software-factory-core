// Which board the factory's work is on, besides its own: for each tracker
// add-on connected (by its id), the label that marks the factory's work,
// which of the board's columns each stage is, and what the add-on needs to
// find the board (a GitHub repository and board, a Jira site and project).
// Kept in the factory's board.json, with the factory, since none of it is
// secret (secrets are in the add-on's settings, on this computer only).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { STAGES } from "../api.ts";

export const BOARD_FILE = "board.json";

// A stage added later (Planning) is "" in a board file written before it.
const stages = z.object(
  Object.fromEntries(
    STAGES.map((stage) => [stage, z.string().default("")]),
  ) as Record<(typeof STAGES)[number], z.ZodDefault<z.ZodString>>,
);

export const boardSchema = z.record(
  z.string(),
  z.looseObject({ label: z.string(), stages }),
);

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
