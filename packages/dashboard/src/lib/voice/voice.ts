// What the speaker (speaker.ts) needs from a voice: whether it can speak a
// language, and saying one sentence. Two voices: Piper on this computer
// (piper-voice.ts), and the browser's own (browser-voice.ts) when Piper
// cannot be used.

import type { Language } from "./languages";

export type Outcome = "said" | "failed" | "no-voice" | "stopped";

// One sentence being said: whether it is still wanted (the speaker may have
// been stopped meanwhile), and where to leave the way to cut it short.
export type Saying = {
  stillWanted(): boolean;
  onCut(cut: () => void): void;
};

export interface Voice {
  has(language: Language): Promise<boolean>;
  // Gets a sentence ready ahead of time, while an earlier one is said.
  prepare?(text: string, language: Language): void;
  speak(text: string, language: Language, saying: Saying): Promise<Outcome>;
  // Stops whatever is being said or got ready.
  cancel(): void;
}

// How long a sentence may take to start before the voice counts as silent.
export const START_WITHIN_MS = 5000;
