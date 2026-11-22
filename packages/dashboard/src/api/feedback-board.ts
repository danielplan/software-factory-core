// The public feedback board, as the page has it: what is on it (to find a
// similar post), what this person sent and where each stands, and who is
// signed in to GitHub. The server reads and writes the board with the
// person's own GitHub sign-in (server/src/feedback/); the page reads it
// through TanStack Query.

import { useQuery } from "@tanstack/react-query";

import { post } from "@/api/client";
import { queryClient, readOf } from "@/api/query";
import {
  type FeedbackKind as Kind,
  type FeedbackPost as Post,
  type FeedbackState as State,
  type FeedbackView,
  feedbackViewSchema,
} from "@/api/schemas/feedback";
import { type GitHubStatus, gitHubStatusSchema } from "@/api/schemas/github";

export type { Kind, Post, State };
export type Mine = FeedbackView["mine"][number];

// The board, read through TanStack Query: again when the server says it
// changed (query.ts) and now and then, as the makers move a post on.
const BOARD = readOf("/api/feedback", feedbackViewSchema);
// Who is signed in to GitHub, kept while signing in.
const STATUS = readOf("/api/add-ons/github/status", gitHubStatusSchema);

const boardNow = () => queryClient.getQueryData<FeedbackView>(BOARD.queryKey);
const statusNow = () => queryClient.getQueryData<GitHubStatus>(STATUS.queryKey);

// Reads the board again.
export function readBoard(): Promise<void> {
  return queryClient.refetchQueries({ queryKey: BOARD.queryKey });
}

function useBoard() {
  return useQuery({ ...BOARD, refetchInterval: 60_000 }).data;
}

// What the GitHub status says, as far as it has been read (never asked
// for here: signing in asks).
function useStatus() {
  return useQuery({ ...STATUS, enabled: false }).data;
}

const NONE: never[] = [];
export const useMine = (): Mine[] => useBoard()?.mine ?? NONE;
export const useOnBoard = (): Post[] => useBoard()?.posts ?? NONE;
export const useBoardName = () => useBoard()?.board ?? "";
export const useSigning = () => useStatus()?.signingIn ?? null;
export function useSignedIn(): string | null {
  const board = useBoard();
  const status = useStatus();
  return status ? status.login : (board?.login ?? null);
}

const signedIn = () => {
  const status = statusNow();
  return status ? status.login : (boardNow()?.login ?? null);
};

// The posts on the board as they are now.
export const onBoard = () => boardNow()?.posts ?? NONE;
export const issueUrl = (number: number) =>
  `${boardNow()?.url ?? ""}/${String(number)}`;

// Signing in to GitHub, with its one-time code to type in the browser; the
// page keeps asking until the person is in, or it did not work.
export async function signIn(): Promise<void> {
  await post("/api/add-ons/github/sign-in", { more: "no" });
  for (;;) {
    const status = await queryClient.query({ ...STATUS, staleTime: 0 });
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
  if (signedIn()) {
    action();
    return;
  }
  void signIn().then(() => {
    if (signedIn()) action();
  });
}

export const stateOf = (posts: Post[], number: number): State | null =>
  posts.find((one) => one.number === number)?.state ?? null;
