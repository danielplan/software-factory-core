// The changes the kobold makes to an exploration's board with its `board`
// tool, in one call: the problem, the question, options added or changed
// (a new one gets the next free letter) or taken off, and notes added or
// taken off. What it cannot do (an option with a prototype stays) is said,
// so it can correct itself. The board as text, for its answer.

import type { Board, Exploration } from "@software-factory/core";

import { Refused } from "../../refused.ts";

export type BoardChange = {
  title?: string;
  problem?: string;
  question?: string;
  options?: { key?: string; name: string; difference?: string }[];
  removeOptions?: string[];
  notes?: string[];
  removeNotes?: number[];
};

const LETTERS = Array.from({ length: 26 }, (_, at) =>
  String.fromCharCode(65 + at),
);

export function nextLetter(taken: string[]): string {
  const free = LETTERS.find((letter) => !taken.includes(letter));
  if (!free) throw new Refused("There are 26 options already.");
  return free;
}

export function changeBoard(board: Board, change: BoardChange): Board {
  const notes = [
    ...board.notes.filter(
      (_, at) => !(change.removeNotes ?? []).includes(at + 1),
    ),
    ...(change.notes ?? []).map((note) => note.trim()).filter(Boolean),
  ];
  return {
    ...board,
    question: change.question?.trim() ?? board.question,
    options: changedOptions(board, change).toSorted((a, b) =>
      a.key.localeCompare(b.key),
    ),
    notes,
  };
}

type Option = Board["options"][number];

// One option added (the next free letter) or changed (by its letter).
function withOption(
  options: Option[],
  option: NonNullable<BoardChange["options"]>[number],
): Option[] {
  const key = option.key?.trim().toUpperCase() ?? "";
  const at = options.findIndex((one) => one.key === key);
  const before = options[at];
  const next = {
    key: before ? key : nextLetter(options.map((one) => one.key)),
    name: option.name.trim(),
    difference: option.difference?.trim() ?? before?.difference ?? "",
  };
  return before ? options.with(at, next) : [...options, next];
}

function changedOptions(board: Board, change: BoardChange): Option[] {
  let options = [...board.options];
  for (const option of change.options ?? [])
    options = withOption(options, option);
  for (const key of change.removeOptions ?? []) {
    if (board.prototypes.some((one) => one.key === key))
      throw new Refused(`Option ${key} has a prototype: it stays.`);
    options = options.filter((one) => one.key !== key);
  }
  return options;
}

// The board in short lines, as the kobold reads it.
export function boardText(exploration: Exploration, board: Board): string {
  const agreedOne = board.prototypes.find((one) => one.agreed);
  return [
    `${exploration.id} · ${exploration.title} (${exploration.status})`,
    `The problem: ${exploration.problem || "not said yet"}`,
    `The question: ${board.question || "not set yet"}`,
    ...board.options.map((option) => {
      const made = board.prototypes.find((one) => one.key === option.key);
      const agreed = made?.agreed ? ", agreed" : "";
      const state = made ? ` (prototype on ${made.branch}${agreed})` : "";
      return `${option.key}. ${option.name}: ${option.difference || "no difference said"}${state}`;
    }),
    ...board.notes.map((note, at) => `Note ${String(at + 1)}: ${note}`),
    agreedOne ? `Agreed: ${agreedOne.key}` : "Nothing agreed yet.",
  ].join("\n");
}
