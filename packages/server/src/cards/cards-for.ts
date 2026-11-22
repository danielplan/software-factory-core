// The cards of the board a factory is connected to: from its company file
// (which tracker) and board.json (which board), made by the extension that
// fills the `tasks` slot with that tracker (the GitHub board, today).

import { join } from "node:path";

import { readCompany } from "@software-factory/core";

import { type Board, readBoard } from "../connect/board-file.ts";
import { Refused } from "../refused.ts";
import type { Cards } from "./cards.ts";

export type Connected = { cards: Cards; repository: string };

// A tracker's cards for its entry in board.json.
export type TasksOf = (entry: Board[string]) => Connected;

// The trackers' cards, by the extension that fills the `tasks` slot.
export type TaskBoards = Readonly<Record<string, TasksOf>>;

// Why there are no cards while no board is chosen.
const NO_BOARD = "No board is connected yet.";

// The factory's folder's cards, or why there are none.
export function cardsFor(
  root: string,
  boards: TaskBoards,
): Connected | { problem: string } {
  const read = readCompany(join(root, "factory.json"));
  if ("problem" in read) return read;
  const { tracker } = read.company;
  const entry = readBoard(root)[tracker];
  const tasks = boards[tracker];
  if (tasks && entry) return tasks(entry);
  return {
    problem:
      tracker === "none"
        ? NO_BOARD
        : `Cards from ${tracker} come later; for now, cards come from a connected GitHub board.`,
  };
}

// The connected board's cards, for Kobble's buttons and Sprocket; refused
// with how to connect one when there is none.
export function connectedCards(factory: string, boards: TaskBoards): Cards {
  const found = cardsFor(factory, boards);
  if ("problem" in found)
    throw new Refused(
      [
        "No GitHub board is connected yet, so there is nowhere to put it.",
        ...(found.problem === NO_BOARD ? [] : [found.problem]),
        "Connect one in [Settings](#settings), under Where work is tracked.",
      ].join(" "),
    );
  return found.cards;
}
