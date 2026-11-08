// What a tracker add-on does for the setup coach, so where work is tracked
// is set up with the owner in setup rather than after: what the coach is
// told before it plans (where the code is, the boards there), and, while
// it builds, connecting the board the owner agreed to, or making a new one
// with the factory's stages as its columns.

import type { Board } from "./board-file.ts";

// The board the owner agreed to: one that is there, or a new one by name;
// the label that marks the factory's work; whether the factory may add the
// columns its stages miss.
export type BoardAsked = {
  board?: number;
  create?: string;
  label?: string;
  addColumns?: boolean;
};

export type TrackerSetup = {
  // The tracker add-on's id.
  id: string;
  facts: (project: string) => Promise<string>;
  connect: (
    project: string,
    asked: BoardAsked,
  ) => Promise<{ entry: Board[string]; said: string }>;
};

// Every tracker's facts, for the coach's first message; none it cannot get.
export async function trackerFacts(
  trackers: TrackerSetup[],
  project: string,
): Promise<string> {
  const facts = await Promise.all(
    trackers.map((tracker) => tracker.facts(project).catch(() => "")),
  );
  return facts.filter(Boolean).join("\n\n");
}
