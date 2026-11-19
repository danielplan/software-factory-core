// The owner's words while they speak, as plain rules. About every half
// second the quick speech model writes a draft of the sentence so far. On
// screen: the words two drafts in a row agree on, from the start, settled;
// the rest of the newest draft, still being heard, in grey. The sentence
// that is sent is written by the accurate model (ears.ts). No browser parts.

import { plainWords } from "./transcript.ts";

export type Shown = { settled: string; grey: string };

export class LiveWords {
  private last: string[] = [];

  // A draft: what to show; null when it has no words.
  show(draft: string): Shown | null {
    const now = splitWords(draft);
    if (now.length === 0) return null;
    const same = sameStart(now.map(plainWords), this.last.map(plainWords));
    this.last = now;
    return {
      settled: now.slice(0, same).join(" "),
      grey: now.slice(same).join(" "),
    };
  }
}

// How many items, from the start, two lists have in common.
function sameStart(a: string[], b: string[]): number {
  let same = 0;
  while (same < a.length && same < b.length && a[same] === b[same]) same += 1;
  return same;
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}
