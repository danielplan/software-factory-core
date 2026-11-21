// What a chat with the kobold is made of: its lines, and the thread that
// holds the post being built and where the talk is.

import type { Draft } from "./draft";
import type { CaughtError } from "./factory-errors";
import type { Kind, State } from "./feedback-board";

// What the kobold says, by name (the words are in i18n/areas/feedback.ts).
export type Say =
  | "invite"
  | "startBug"
  | "startWish"
  | "startAsk"
  | "askWish"
  | "askBug"
  | "askError"
  | "askAgain"
  | "similar"
  | "draft"
  | "added"
  | "thumbed"
  | "posted"
  | "moved"
  | "cleaned";

export type Extra = { number?: number; state?: State; error?: string };

export type Line =
  | { id: number; from: "you"; text: string }
  | ({ id: number; from: "kobold"; say: Say } & Extra);

// "choose" is the window's opening (its suggestions and three starting
// choices), "ask" a question to the support kobold.
export type Step =
  | "choose"
  | "ask"
  | "listen"
  | "question"
  | "again"
  | "similar"
  | "draft"
  | "sent";

export type Thread = {
  kind: Kind;
  said: string;
  answers: string[];
  page: string;
  errors: CaughtError[];
  step: Step;
  thinking: boolean;
  lines: Line[];
  similar: number | null;
  draft: Draft | null;
  // Opened from an error the factory caught: no second question.
  fromError: boolean;
  // Started from "Something is wrong" or "I wish…": the kind is known.
  chosen: boolean;
  // The post this chat follows (the one sent, or the one given a 👍), and
  // the state it last said.
  follows: number | null;
  followsState: State | null;
  // Sending now (waiting for GitHub), and why the last send did not work.
  sending: boolean;
  problem: string | null;
};
