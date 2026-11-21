// The hand-offs under way: writing the spec, making the card and stopping
// the prototypes take a while, so the page shows each stage, since when,
// and what the spec writer did, instead of a button that only says it is
// busy.

import { Refused } from "../../refused.ts";

export const HAND_OFF_STAGES = ["spec", "card", "prototypes"] as const;
export type HandOffStage = (typeof HAND_OFF_STAGES)[number];

export type HandingOff = {
  since: string;
  stage: HandOffStage;
  // What the spec writer did, oldest first (the last 40).
  steps: string[];
};

export class HandOffs {
  private readonly now = new Map<string, HandingOff>();
  private readonly onChange: () => void;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  of(exploration: string): HandingOff | null {
    return this.now.get(exploration) ?? null;
  }

  // Runs one hand-off, told each stage and step; refused while one is under
  // way.
  async run<T>(
    exploration: string,
    work: (on: {
      stage: (stage: HandOffStage) => void;
      step: (line: string) => void;
    }) => Promise<T>,
  ): Promise<T> {
    if (this.now.has(exploration))
      throw new Refused("It is being handed off already.");
    this.now.set(exploration, {
      since: new Date().toISOString(),
      stage: "spec",
      steps: [],
    });
    this.onChange();
    const change = (next: (at: HandingOff) => HandingOff) => {
      const at = this.now.get(exploration);
      if (!at) return;
      this.now.set(exploration, next(at));
      this.onChange();
    };
    try {
      return await work({
        stage: (stage) => {
          change((at) => ({ ...at, stage }));
        },
        step: (line) => {
          change((at) => ({
            ...at,
            steps: [...at.steps, line.slice(0, 160)].slice(-40),
          }));
        },
      });
    } finally {
      this.now.delete(exploration);
      this.onChange();
    }
  }
}
