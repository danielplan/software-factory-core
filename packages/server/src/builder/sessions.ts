// A card's building sessions in a row. A session that ends with "continue"
// (the agreed scope is not finished and nothing blocks it) is followed by the
// next one, which carries on from the run file, with no question to the
// owner. It gives up when sessions add no commit twice in a row, or after
// CONTINUE_SESSIONS in all.

// Sessions in a row on one card before the builder gives up with a draft.
const CONTINUE_SESSIONS = 12;
// Sessions in a row that may add no commit.
const STALLED_SESSIONS = 2;
// A progress note on the card every this many sessions.
const PROGRESS_EVERY = 3;

export type Answer = { status: string; text: string };

export type SessionSteps = {
  // One session; true when earlier work on the branch exists.
  session: (continued: boolean) => Promise<Answer>;
  // The commit the branch is on.
  head: () => Promise<string>;
  // Tells the owner how far it is.
  progress: (session: number, text: string) => Promise<void>;
};

export async function runSessions(
  continued: boolean,
  steps: SessionSteps,
): Promise<{ answer: Answer; gaveUp: string | null }> {
  let stalled = 0;
  // The commit after the last session; the first has nothing to compare with
  // (the copy is only made on the card's branch as it starts).
  let last: string | null = null;
  for (let n = 1; ; n++) {
    const answer = await steps.session(continued || n > 1);
    if (answer.status !== "continue") return { answer, gaveUp: null };
    const head = await steps.head();
    stalled = head === last ? stalled + 1 : 0;
    last = head;
    if (stalled >= STALLED_SESSIONS)
      return {
        answer,
        gaveUp: `${answer.text}\n\nThe builder said it was not finished, but ${String(STALLED_SESSIONS)} sessions in a row added nothing, so it stopped.`,
      };
    if (n >= CONTINUE_SESSIONS)
      return {
        answer,
        gaveUp: `${answer.text}\n\nThe builder worked ${String(CONTINUE_SESSIONS)} sessions in a row and is still not finished, so it stopped.`,
      };
    if (n % PROGRESS_EVERY === 0) await steps.progress(n, answer.text);
  }
}
