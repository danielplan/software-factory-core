// Variant F, "Tell the kobold": no form. The person tells Sprocket, in the
// support bar, a wish or something wrong in their own words; the kobold
// asks one or two short questions, looks for similar posts on the public
// board, writes a title and a description and shows the draft with what
// goes along. One Send with their GitHub sign-in; afterwards it follows the
// post's state in the same chat. A caught error opens this chat filled in.
//
// The kobold's side is a short script in this browser, no model; the board
// and its posts are the real one's (api/feedback-board.ts).

import { useSyncExternalStore } from "react";

import { messageOf } from "@/api/client";

import { bodyOf, type Draft, draftOf, lowerFirst, withoutTeam } from "./draft";
import { type CaughtError, putAway } from "./factory-errors";
import {
  addThumb,
  type Kind,
  onBoard,
  send as sendToBoard,
  stateOf,
  type State,
} from "@/api/feedback-board";
import { findSimilarPosts } from "./similar";
import type { Extra, Line, Say, Thread } from "./thread";
import { isBugWords } from "./words";

export { teamBits } from "./draft";
export type { Draft, Part } from "./draft";
export type { Line, Thread } from "./thread";
export { findSimilarPosts } from "./similar";
export { looksLikeFeedback } from "./words";

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
export function open() {
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
  chosen: false,
  follows: null,
  followsState: null,
  sending: false,
  problem: null,
});

// The person starts from the sidebar: the help window shows its three
// starting choices.
export function invite(page: string) {
  thread = { ...empty(page), step: "choose" };
  tell();
  open();
}

// One of the three starting choices: the chat starts with a matching line.
export function start(choice: Kind | "ask") {
  if (!thread) return;
  if (choice === "ask") {
    askMode(thread.page);
    return;
  }
  change({ kind: choice, chosen: true, step: "listen", lines: [] });
  answer([kobold(choice === "bug" ? "startBug" : "startWish")], {}, 450);
}

// A suggestion of the opening, already in words ("Builder stopped?"):
// the post starts with them.
export function startWith(
  kind: Kind,
  said: string,
  page: string,
  errors: CaughtError[],
) {
  thread = { ...empty(page), kind, chosen: true };
  say(said, page, errors);
  open();
}

// A question for the support kobold, in the same window.
export function askMode(page: string, greet = true) {
  thread = { ...empty(page), step: "ask" };
  tell();
  if (greet) answer([kobold("startAsk")], {}, 450);
}

// A 👍 on a post that slid in while the person typed.
export function thumbFor(number: number) {
  const there = onBoard().find((one) => one.number === number);
  if (!there) return;
  if (!thread || ["sent", "choose", "ask"].includes(thread.step))
    thread = empty(thread?.page ?? "");
  // What the 👍 went to, said as the person's own line.
  const liked = you(`👍 #${String(number)} ${there.title}`);
  thread = {
    ...thread,
    kind: there.kind,
    similar: number,
    lines: [...thread.lines, liked],
  };
  thumb();
}

// Takes out all that looks like the team's data, in one go.
export function removeTeamData(taken: string) {
  const draft = thread?.draft;
  if (!draft) return;
  editDraft({
    parts: draft.parts.map((part) => ({
      ...part,
      text: withoutTeam(part.text, taken),
    })),
  });
  answer([kobold("cleaned")], {}, 400);
}

// The post as it is so far, building itself while the person talks.
export function liveDraft(at: Thread): Draft | null {
  return at.draft ?? (at.said ? draftOf(at) : null);
}

// Back to the three starting choices.
export function back() {
  if (thread) thread = { ...empty(thread.page), step: "choose" };
  tell();
}

// The factory hit an error: the chat opens with it filled in.
export function reportError(error: CaughtError, page: string, report: string) {
  putAway();
  thread = {
    ...empty(page),
    kind: "bug",
    fromError: true,
    said: error.text,
    errors: [error],
    step: "question",
    lines: [you(report), kobold("askError", { error: error.text })],
  };
  tell();
  open();
}

// The person's first words: what kind of post it is, and the first question.
function listened(said: string, lines: Line[], errors: CaughtError[]) {
  if (!thread) return;
  let { kind } = thread;
  if (!thread.chosen) kind = isBugWords(said) ? "bug" : "wish";
  change({
    kind,
    said,
    lines,
    step: "question",
    // A bug goes with the errors the factory caught lately.
    errors: kind === "bug" ? errors.slice(-1) : [],
  });
  answer([kobold(kind === "bug" ? "askBug" : "askWish")]);
}

// More words once the draft is there: they join the description.
function added(said: string, lines: Line[]) {
  if (!thread) return;
  if (thread.draft)
    change({
      lines,
      draft: { ...thread.draft, body: `${thread.draft.body}\n\n${said}` },
    });
  answer([kobold("added")]);
}

// What the person says in the chat, at whatever step it is.
export function say(text: string, page: string, errors: CaughtError[]) {
  const said = text.trim();
  if (!said) return;
  if (!thread || ["sent", "choose", "ask"].includes(thread.step))
    thread = empty(page);
  const lines = [...thread.lines, you(said)];
  switch (thread.step) {
    case "listen":
      listened(said, lines, errors);
      return;
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
      added(said, lines);
      return;
    case "sent":
    case "choose":
    case "ask":
      return;
  }
}

// What an answer is kept as, with what it answers, so the post reads on its
// own.
function keptAnswer(at: Thread, text: string): string {
  let label: string | null = null;
  if (at.step === "again") label = "How often";
  else if (at.kind === "bug") label = "When it happened";
  return label ? `${label}: ${lowerFirst(text)}` : text;
}

// An answer to one of the kobold's questions, said or a quick reply (shown
// as the reply, kept as the answer: "Skip" keeps nothing).
export function reply(shown: string, text = shown) {
  if (!thread) return;
  const kept = keptAnswer(thread, text);
  const answers = text ? [...thread.answers, kept] : thread.answers;
  const lines =
    thread.lines.at(-1)?.from === "you"
      ? thread.lines
      : [...thread.lines, you(shown)];
  // A bug told in words gets one more question.
  if (
    thread.step === "question" &&
    thread.kind === "bug" &&
    !thread.fromError
  ) {
    change({ answers, lines, step: "again" });
    answer([kobold("askAgain")]);
    return;
  }
  change({ answers, lines });
  const similar = findSimilar(
    `${thread.said} ${answers.join(" ")}`,
    thread.kind,
  );
  if (similar) {
    change({ step: "similar", similar: similar.number });
    answer([kobold("similar", { number: similar.number })], {}, 1100);
    return;
  }
  writeDraft();
}

const findSimilar = (text: string, kind: Kind) =>
  findSimilarPosts(text, kind, onBoard())[0];

// The person adds a 👍 to the similar post instead of a new one.
export function thumb() {
  if (!thread || thread.similar === null || thread.sending) return;
  const number = thread.similar;
  change({ sending: true, problem: null });
  addThumb(number).then(
    () => {
      if (!thread) return;
      // An error that went along is reported with it.
      if (thread.errors.length > 0) putAway();
      change({
        step: "sent",
        sending: false,
        follows: number,
        followsState: stateOf(onBoard(), number),
      });
      answer([kobold("thumbed", { number })]);
    },
    (error: unknown) => {
      change({ sending: false, problem: messageOf(error) });
    },
  );
}

// Theirs is different: the kobold writes the draft.
export function writeDraft() {
  if (!thread) return;
  change({ step: "draft", draft: draftOf(thread) });
  answer([kobold("draft")], {}, 1000);
}

export function editDraft(edit: Partial<Draft>) {
  if (thread?.draft) change({ draft: { ...thread.draft, ...edit } });
}

// One Send: on the board as a new post, followed here.
export function sendDraft() {
  if (!thread?.draft || thread.sending) return;
  const { draft, kind } = thread;
  change({ sending: true, problem: null });
  sendToBoard(kind, draft.title.trim(), bodyOf(draft)).then(
    (posted) => {
      // The errors it took along are reported: the notice goes.
      if (draft.parts.some((part) => part.label === "error" && !part.removed))
        putAway();
      change({
        step: "sent",
        sending: false,
        follows: posted.number,
        followsState: posted.state,
      });
      answer([kobold("posted", { number: posted.number })], {}, 500);
    },
    (error: unknown) => {
      change({ sending: false, problem: messageOf(error) });
    },
  );
}

// The post moved on the board: the kobold says so in the chat.
export function moved(number: number, state: State) {
  if (thread?.follows !== number || thread.followsState === state) return;
  change({
    followsState: state,
    lines: [...thread.lines, kobold("moved", { number, state })],
  });
}
