// The pull requests the board's cards have, as last read: each card's
// address (kept once seen, so the card links to it from then on), its state
// (open, draft, merged or closed) and whether an open one clashes with main.

import type { BoardCard } from "./decide.ts";

export type PullRequestState = "open" | "draft" | "merged" | "closed";

export class SeenPullRequests {
  private readonly urls = new Map<number, string>();
  private readonly clashing = new Set<number>();
  private readonly states = new Map<number, PullRequestState>();

  note(board: BoardCard[]): void {
    for (const card of board) {
      if (card.pullRequest) {
        this.urls.set(card.number, card.pullRequest.url);
        this.states.set(card.number, stateOf(card.pullRequest));
      }
      if (card.pullRequest?.state === "OPEN" && card.pullRequest.conflicting)
        this.clashing.add(card.number);
      else this.clashing.delete(card.number);
    }
  }

  of(number: number): {
    pullRequest: string | null;
    pullRequestState: PullRequestState | null;
    conflict: boolean;
  } {
    return {
      pullRequest: this.urls.get(number) ?? null,
      pullRequestState: this.states.get(number) ?? null,
      conflict: this.clashing.has(number),
    };
  }
}

function stateOf(pr: { state: string; draft: boolean }): PullRequestState {
  if (pr.state === "MERGED") return "merged";
  if (pr.state === "CLOSED") return "closed";
  return pr.draft ? "draft" : "open";
}
