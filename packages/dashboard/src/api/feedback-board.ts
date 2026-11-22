// The public feedback board, as the page has it: what is on it (to find a
// similar post), what this person sent and where each stands, and who is
// signed in to GitHub. The server reads and writes the board with the
// person's own GitHub sign-in (server/src/feedback/); this keeps the answer
// and reads it again when it changes.

import { useSyncExternalStore } from "react";

import {
  type FeedbackKind as Kind,
  type FeedbackPost as Post,
  type FeedbackState as State,
  type FeedbackView,
  get,
  onKobbleChanged,
  post,
} from "@/api/client";

export type { Kind, Post, State };
export type Mine = FeedbackView["mine"][number];

type GitHubStatus = {
  cli: boolean;
  login: string | null;
  signingIn: { code: string | null; problem: string | null } | null;
};

type Board = {
  board: string;
  url: string;
  login: string | null;
  posts: Post[];
  mine: Mine[];
  signing: GitHubStatus["signingIn"];
};

let board: Board = {
  board: "",
  url: "",
  login: null,
  posts: [],
  mine: [],
  signing: null,
};
const listeners = new Set<() => void>();

function tell() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let reading: Promise<void> | null = null;

// Reads the board again (one read at a time).
export function readBoard(): Promise<void> {
  reading ??= get<FeedbackView>("/api/feedback")
    .then((view) => {
      board = { ...board, ...view };
      tell();
    })
    .catch(() => undefined)
    .finally(() => {
      reading = null;
    });
  return reading;
}

let started = false;

// Starts reading, and reads again when the server says the board changed
// and now and then, as the makers move a post on.
function start() {
  if (started) return;
  started = true;
  void readBoard();
  onKobbleChanged(() => {
    void readBoard();
  });
  setInterval(() => {
    void readBoard();
  }, 60_000);
}

function useBoard<T>(pick: (from: Board) => T): T {
  start();
  return useSyncExternalStore(subscribe, () => pick(board));
}

export const useMine = () => useBoard((from) => from.mine);
export const useOnBoard = () => useBoard((from) => from.posts);
export const useSignedIn = () => useBoard((from) => from.login);
export const useSigning = () => useBoard((from) => from.signing);
export const useBoardName = () => useBoard((from) => from.board);

// The posts on the board as they are now.
export const onBoard = () => board.posts;
export const issueUrl = (number: number) => `${board.url}/${String(number)}`;

// Signing in to GitHub, with its one-time code to type in the browser; the
// page keeps asking until the person is in, or it did not work.
export async function signIn(): Promise<void> {
  const look = async () => {
    const status = await get<GitHubStatus>("/api/add-ons/github/status");
    board = { ...board, login: status.login, signing: status.signingIn };
    tell();
    return status;
  };
  await post("/api/add-ons/github/sign-in", { more: "no" });
  for (;;) {
    const status = await look();
    if (status.login || status.signingIn?.problem) break;
    if (!status.signingIn) break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  await readBoard();
}

// Sends it as a new post, with the person's own sign-in.
export async function send(
  kind: Kind,
  title: string,
  body: string,
): Promise<Post> {
  const sent = await post<Post>("/api/feedback/send", { kind, title, body });
  await readBoard();
  return sent;
}

// Adds a 👍 to a post already there, and follows it.
export async function addThumb(number: number): Promise<void> {
  await post("/api/feedback/thumb", { number });
  await readBoard();
}

// Does what needs the sign-in: now when the person is in, else once they
// have signed in.
export function withSignIn(action: () => void): void {
  if (board.login) {
    action();
    return;
  }
  void signIn().then(() => {
    if (board.login) action();
  });
}

export const stateOf = (posts: Post[], number: number): State | null =>
  posts.find((one) => one.number === number)?.state ?? null;
