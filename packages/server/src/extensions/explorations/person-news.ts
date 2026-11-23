// What people did on a board since the kobold last heard, by exploration:
// their words for it, and the things they put there (taken in once the
// kobold has answered with them in front of it, never before).

import type { KobbleStore } from "@software-factory/core";

export type News = { words: string[]; things: string[] };

export class PersonNews {
  private readonly words = new Map<string, string[]>();
  private readonly things = new Map<string, string[]>();

  add(id: string, words: string, things: string[] = []): void {
    const before = this.words.get(id) ?? [];
    this.words.set(id, before.includes(words) ? before : [...before, words]);
    this.hold(id, things);
  }

  // Things the kobold hears of in some other way (said at once).
  hold(id: string, things: string[]): void {
    if (things.length > 0)
      this.things.set(id, [...(this.things.get(id) ?? []), ...things]);
  }

  // What the kobold is about to hear.
  take(id: string): News {
    const news = {
      words: this.words.get(id) ?? [],
      things: this.things.get(id) ?? [],
    };
    this.words.delete(id);
    this.things.delete(id);
    return news;
  }

  // The answer failed: it hears what had things with it again.
  giveBack(id: string, news: News): void {
    if (news.things.length === 0) return;
    this.words.set(id, [...news.words, ...(this.words.get(id) ?? [])]);
    this.things.set(id, [...news.things, ...(this.things.get(id) ?? [])]);
  }
}

// The things the kobold acted on, marked taken in.
export function takenIn(
  store: KobbleStore,
  id: string,
  things: string[],
): boolean {
  if (things.length === 0) return false;
  const board = store.board(id);
  store.saveBoard(id, {
    ...board,
    things: board.things.map((one) =>
      things.includes(one.id) ? { ...one, taken: true } : one,
    ),
  });
  return true;
}
