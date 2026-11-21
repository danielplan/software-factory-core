// The pull requests the board's cards have, as last read: each card's
// address (kept once seen, so the card links to it from then on) and whether
// its open pull request clashes with main.

import type { BoardCard } from "./decide.ts";

export class SeenPullRequests {
  private readonly urls = new Map<number, string>();
  private readonly clashing = new Set<number>();

  note(board: BoardCard[]): void {
    for (const card of board) {
      if (card.pullRequest) this.urls.set(card.number, card.pullRequest.url);
      if (card.pullRequest?.state === "OPEN" && card.pullRequest.conflicting)
        this.clashing.add(card.number);
      else this.clashing.delete(card.number);
    }
  }

  of(number: number): { pullRequest: string | null; conflict: boolean } {
    return {
      pullRequest: this.urls.get(number) ?? null,
      conflict: this.clashing.has(number),
    };
  }
}
