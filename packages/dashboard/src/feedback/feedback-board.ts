// The public feedback board: a GitHub repository just for feedback, beside
// the core's own (github:owner/software-factory-core →
// owner/software-factory-feedback). Feedback is sent with the person's own
// GitHub sign-in and lands there as an issue; its state comes back from the
// issue's labels: sent (no label yet), seen, planned, done.
//
// PROTOTYPE: nothing is sent. The sign-in, what is on the board and what
// this person sent before are made up; what they send now is kept in this
// browser and moves from sent to seen after a little while, as if the
// makers had read it.

import { useSyncExternalStore } from "react";

import { RELEASE_SOURCE } from "@/api";

export type Kind = "bug" | "wish";
export type State = "sent" | "seen" | "planned" | "done";

const OWNER = RELEASE_SOURCE.replace(/^github:/, "").split("/")[0] ?? "";
export const BOARD = `${OWNER}/software-factory-feedback`;
export const BOARD_URL = `https://github.com/${BOARD}/issues`;

export const issueUrl = (number: number) => `${BOARD_URL}/${String(number)}`;

// What is already on the board, to add a 👍 instead of a new one.
export const ON_BOARD: {
  number: number;
  kind: Kind;
  title: string;
  thumbs: number;
  state: State;
}[] = [
  {
    number: 41,
    kind: "bug",
    title: "The builder stops when git push is refused",
    thumbs: 7,
    state: "seen",
  },
  {
    number: 38,
    kind: "wish",
    title: "Let the builder work on two cards at once",
    thumbs: 12,
    state: "planned",
  },
  {
    number: 35,
    kind: "bug",
    title: "Board card crashes when a column was renamed",
    thumbs: 3,
    state: "seen",
  },
  {
    number: 29,
    kind: "wish",
    title: "Show signals from Slack on the Signals page",
    thumbs: 9,
    state: "sent",
  },
  {
    number: 22,
    kind: "wish",
    title: "A dark look for the dashboard",
    thumbs: 15,
    state: "planned",
  },
];

export type Mine = {
  number: number;
  kind: Kind;
  title: string;
  state: State;
  // When it was sent, in ms (to move a new one on to "seen").
  sent: number;
};

const MINE_KEY = "feedback-mine";
const SIGNED_KEY = "feedback-github";
const SEEN_AFTER = 20_000;

const BEFORE: Mine[] = [
  {
    number: 44,
    kind: "wish",
    title: "Show which prototype a card came from",
    state: "seen",
    sent: 0,
  },
  {
    number: 33,
    kind: "wish",
    title: "Say in the card when the builder waits for me",
    state: "done",
    sent: 0,
  },
  {
    number: 27,
    kind: "bug",
    title: "Signals page is empty after a restart",
    state: "planned",
    sent: 0,
  },
];

function read<T>(key: string, fallback: T): T {
  try {
    const kept = localStorage.getItem(key);
    return kept ? (JSON.parse(kept) as T) : fallback;
  } catch {
    return fallback;
  }
}

let mine: Mine[] = read<Mine[]>(MINE_KEY, BEFORE);
let signedIn: string | null = read<string | null>(SIGNED_KEY, null);
const listeners = new Set<() => void>();

function tell() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// A new one is seen by the makers after a while (made up).
setInterval(() => {
  const now = Date.now();
  if (!mine.some((one) => one.state === "sent" && now - one.sent > SEEN_AFTER))
    return;
  mine = mine.map((one) =>
    one.state === "sent" && now - one.sent > SEEN_AFTER
      ? { ...one, state: "seen" }
      : one,
  );
  localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  tell();
}, 2000);

export function useMine(): Mine[] {
  return useSyncExternalStore(subscribe, () => mine);
}

export function useSignedIn(): string | null {
  return useSyncExternalStore(subscribe, () => signedIn);
}

// PROTOTYPE: GitHub's sign-in (its device flow, a code to type on
// github.com) is skipped; the person is signed in as a made-up account.
export function signIn() {
  signedIn = "you-made-up";
  localStorage.setItem(SIGNED_KEY, JSON.stringify(signedIn));
  tell();
}

export function signOut() {
  signedIn = null;
  localStorage.removeItem(SIGNED_KEY);
  tell();
}

// Sends it as an issue on the board (made up: the next number).
export function send(kind: Kind, title: string): Mine {
  const highest = Math.max(47, ...mine.map((one) => one.number));
  const one: Mine = {
    number: highest + 1,
    kind,
    title,
    state: "sent",
    sent: Date.now(),
  };
  mine = [one, ...mine];
  localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  tell();
  return one;
}

// Adds a 👍 to a post already on the board, and follows it (made up).
export function addThumb(number: number): void {
  const there = ON_BOARD.find((one) => one.number === number);
  if (!there || mine.some((one) => one.number === number)) return;
  // Followed from now: it moves on after a while, not the moment it is
  // given a 👍.
  mine = [{ ...there, sent: Date.now() }, ...mine];
  localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  tell();
}

// PROTOTYPE: the makers move a post on (made up, to show it followed).
export function moveOn(number: number, state: State): void {
  mine = mine.map((one) => (one.number === number ? { ...one, state } : one));
  localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  tell();
}
