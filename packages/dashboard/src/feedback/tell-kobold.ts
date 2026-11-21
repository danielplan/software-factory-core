// Variant F, "Tell the kobold": no form. The person tells Sprocket, in the
// support bar, a wish or something wrong in their own words; the kobold
// asks one or two short questions, looks for similar posts on the public
// board, writes a title and a description and shows the draft with what
// goes along. One Send with their GitHub sign-in; afterwards it follows the
// post's state in the same chat. A caught error opens this chat filled in.
//
// PROTOTYPE: the kobold's side is a short script in this browser, no
// model; the board, its posts and how they move are made up
// (feedback-board.ts).

import { useSyncExternalStore } from "react";

import { CORE_VERSION } from "@/api";

import { type CaughtError, putAway } from "./factory-errors";
import {
  addThumb,
  type Kind,
  moveOn,
  ON_BOARD,
  send as sendToBoard,
  type State,
} from "./feedback-board";

// What the kobold says, by name (the words are in i18n/areas/feedback.ts).
export type Say =
  | "invite"
  | "askWish"
  | "askBug"
  | "askError"
  | "askAgain"
  | "similar"
  | "draft"
  | "added"
  | "thumbed"
  | "posted"
  | "moved";

type Extra = { number?: number; state?: State; error?: string };

export type Line =
  | { id: number; from: "you"; text: string }
  | ({ id: number; from: "kobold"; say: Say } & Extra);

export type Part = {
  id: string;
  label: "version" | "page" | "error";
  at?: string;
  text: string;
  removed: boolean;
};

export type Draft = { title: string; body: string; parts: Part[] };

type Step = "listen" | "question" | "again" | "similar" | "draft" | "sent";

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
  // The post this chat follows (the one sent, or the one given a 👍), and
  // the state it last said.
  follows: number | null;
  followsState: State | null;
};

let thread: Thread | null = null;
let next = 1;
const listeners = new Set<() => void>();

function tell() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useThread(): Thread | null {
  return useSyncExternalStore(subscribe, () => thread);
}

function change(edit: Partial<Thread>) {
  if (thread) thread = { ...thread, ...edit };
  tell();
}

function you(text: string): Line {
  return { id: next++, from: "you", text };
}

function kobold(say: Say, more: Extra = {}): Line {
  return { ...more, id: next++, from: "kobold", say };
}

// The kobold answers after a moment, as if it thought.
function answer(lines: Line[], edit: Partial<Thread> = {}, wait = 700) {
  change({ thinking: true });
  setTimeout(() => {
    if (!thread) return;
    change({ ...edit, thinking: false, lines: [...thread.lines, ...lines] });
  }, wait);
}

// Opens the support bar (it listens).
const OPEN = "kobble:open-support";
export function onOpen(listener: () => void): () => void {
  window.addEventListener(OPEN, listener);
  return () => {
    window.removeEventListener(OPEN, listener);
  };
}
function open() {
  window.dispatchEvent(new Event(OPEN));
}

const empty = (page: string): Thread => ({
  kind: "wish",
  said: "",
  answers: [],
  page,
  errors: [],
  step: "listen",
  thinking: false,
  lines: [],
  similar: null,
  draft: null,
  fromError: false,
  follows: null,
  followsState: null,
});

// Words that sound like a wish or something wrong, in the three languages.
const FEEDBACK =
  /\b(i wish|wish|would be (nice|great|good|cool)|it would help|would love|please add|could you add|missing|bug|broken|doesn'?t work|does not work|not working|crash\w*|error|stops?|stuck|wrong|feedback|vorrei|sarebbe bello|non funziona|errore|wünsch\w*|wäre (schön|gut)|funktioniert nicht|fehler|kaputt)\b/i;
const BUG =
  /\b(bug|broken|doesn'?t work|does not work|not working|crash\w*|error|stops?|stuck|wrong|fails?|non funziona|errore|si blocca|funktioniert nicht|fehler|kaputt|hängt)\b/i;

export function looksLikeFeedback(text: string): boolean {
  return FEEDBACK.test(text);
}

// The person starts from the sidebar: the kobold asks them to tell it.
export function invite(page: string) {
  thread = { ...empty(page), lines: [kobold("invite")] };
  tell();
  open();
}

// The factory hit an error: the chat opens with it filled in.
export function reportError(error: CaughtError, page: string, report: string) {
  putAway();
  thread = {
    ...empty(page),
    kind: "bug",
    fromError: true,
    said: error.text.replace(/^Made up: /, ""),
    errors: [error],
    step: "question",
    lines: [you(report), kobold("askError", { error: error.text })],
  };
  tell();
  open();
}

// What the person says in the chat, at whatever step it is.
export function say(text: string, page: string, errors: CaughtError[]) {
  const said = text.trim();
  if (!said) return;
  if (!thread || thread.step === "sent") thread = empty(page);
  const lines = [...thread.lines, you(said)];
  switch (thread.step) {
    case "listen": {
      const kind: Kind = BUG.test(said) ? "bug" : "wish";
      change({
        kind,
        said,
        lines,
        step: "question",
        // A bug goes with the errors the factory caught lately.
        errors: kind === "bug" ? errors.slice(-1) : [],
      });
      answer([kobold(kind === "bug" ? "askBug" : "askWish")]);
      return;
    }
    case "question":
    case "again":
      change({ lines });
      reply(said);
      return;
    case "similar":
      change({ lines });
      writeDraft();
      return;
    case "draft":
      if (thread.draft)
        change({
          lines,
          draft: { ...thread.draft, body: `${thread.draft.body}\n\n${said}` },
        });
      answer([kobold("added")]);
      return;
    case "sent":
      return;
  }
}

// An answer to one of the kobold's questions, said or a quick reply (shown
// as the reply, kept as the answer: "Skip" keeps nothing).
export function reply(shown: string, text = shown) {
  if (!thread) return;
  const answers = text ? [...thread.answers, text] : thread.answers;
  const lines =
    thread.lines.at(-1)?.from === "you" ? thread.lines : [...thread.lines, you(shown)];
  // A bug told in words gets one more question.
  if (thread.step === "question" && thread.kind === "bug" && !thread.fromError) {
    change({ answers, lines, step: "again" });
    answer([kobold("askAgain")]);
    return;
  }
  change({ answers, lines });
  const similar = findSimilar(`${thread.said} ${answers.join(" ")}`, thread.kind);
  if (similar) {
    change({ step: "similar", similar: similar.number });
    answer([kobold("similar", { number: similar.number })], {}, 1100);
    return;
  }
  writeDraft();
}

function findSimilar(text: string, kind: Kind) {
  const words = text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 3);
  const score = (one: (typeof ON_BOARD)[number]) =>
    words.filter((word) => one.title.toLowerCase().includes(word)).length;
  return ON_BOARD.filter((one) => one.kind === kind && score(one) > 0).sort(
    (a, b) => score(b) - score(a) || b.thumbs - a.thumbs,
  )[0];
}

// The person adds a 👍 to the similar post instead of a new one.
export function thumb() {
  if (thread?.similar == null) return;
  addThumb(thread.similar);
  const number = thread.similar;
  const state = ON_BOARD.find((one) => one.number === number)?.state ?? null;
  change({ step: "sent", follows: number, followsState: state });
  answer([kobold("thumbed", { number })]);
}

// Theirs is different: the kobold writes the draft.
export function writeDraft() {
  if (!thread) return;
  const { kind, said, answers, page, errors } = thread;
  const draft: Draft = {
    title: titleOf(said, kind),
    // An error goes along below, where its team data can be taken out.
    body: [
      thread.fromError ? "The factory hit the error below." : sentence(said),
      ...answers.map(sentence),
    ].join("\n\n"),
    parts: [
      { id: "version", label: "version", text: `Kobble ${CORE_VERSION}`, removed: false },
      { id: "page", label: "page", text: page, removed: false },
      ...errors.map((error) => ({
        id: `error-${String(error.id)}`,
        label: "error" as const,
        at: error.at,
        text: error.text,
        removed: false,
      })),
    ],
  };
  change({ step: "draft", draft });
  answer([kobold("draft")], {}, 1200);
}

export function editDraft(edit: Partial<Draft>) {
  if (thread?.draft) change({ draft: { ...thread.draft, ...edit } });
}

// One Send: on the board as a new post, followed here.
export function sendDraft() {
  if (!thread?.draft) return;
  const posted = sendToBoard(thread.kind, thread.draft.title.trim());
  change({ step: "sent", follows: posted.number, followsState: "sent" });
  answer([kobold("posted", { number: posted.number })], {}, 500);
  // PROTOTYPE: the makers plan it, then do it (made up, quickly).
  setTimeout(() => {
    moveOn(posted.number, "planned");
  }, 45_000);
  setTimeout(() => {
    moveOn(posted.number, "done");
  }, 75_000);
}

// The post moved on the board: the kobold says so in the chat.
export function moved(number: number, state: State) {
  if (thread?.follows !== number || thread.followsState === state) return;
  change({
    followsState: state,
    lines: [...thread.lines, kobold("moved", { number, state })],
  });
}

export function clear() {
  thread = null;
  tell();
}

// A clean title from the person's words (English; others kept as said).
function titleOf(said: string, kind: Kind): string {
  let title = (withoutTeamData(said).split(/(?<=[.!?])\s/)[0] ?? said)
    .replace(/[.!?]+$/, "")
    .replace(/^i wish i could\s+/i, "Let me ")
    .replace(/^i wish (kobble|it|the factory) (would|could)\s+/i, "")
    .replace(/^i wish there (was|were) (an? )?/i, "Add ")
    .replace(/^(it would be (nice|great|good) if|would be (nice|great) if)\s+/i, "")
    .trim();
  if (kind === "bug") title = title.replace(/^error:\s*/i, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.length > 80 ? `${title.slice(0, 77)}…` : title;
}

const sentence = (text: string) => {
  const trimmed = text.trim();
  const up = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(up) ? up : `${up}.`;
};

// What in a text looks like a team's data: repositories, quoted titles,
// people's names. Marked so the person can take it out.
const TEAM =
  /(github\.com\/[\w.-]+\/[\w.-]+|“[^”]+”|"[^"]+"|\b[A-Z][a-z]+ [A-Z][a-z]+(?:'s)?\b)/g;

// A title never carries the team's data.
function withoutTeamData(text: string): string {
  return text
    .replaceAll(/github\.com\/[\w.-]+\/[\w.-]+/g, "the repository")
    .replaceAll(/\s*(for card\s*)?(“[^”]+”|"[^"]+")/g, "")
    .replaceAll(/\s*\(exit \d+\)/g, "");
}

export function teamBits(text: string): { text: string; team: boolean }[] {
  const bits: { text: string; team: boolean }[] = [];
  let at = 0;
  for (const match of text.matchAll(TEAM)) {
    if (match.index > at) bits.push({ text: text.slice(at, match.index), team: false });
    bits.push({ text: match[0], team: true });
    at = match.index + match[0].length;
  }
  if (at < text.length) bits.push({ text: text.slice(at), team: false });
  return bits;
}
