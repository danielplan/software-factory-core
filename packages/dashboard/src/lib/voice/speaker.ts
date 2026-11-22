// The speaker: reads the coach's answer out loud, sentence by sentence as it
// arrives, in the language of the reply, with Piper on this computer
// (piper-voice.ts; the browser's own voice when Piper cannot be used). It
// says one sentence at a time and gets the next one ready meanwhile; a
// sentence that could not be played is reported instead of being taken as
// said. It stops at once when the owner asks it to stop or ends the call.

import type { Language } from "./languages";

import { BrowserVoice } from "./browser-voice";
import { PiperVoice } from "./piper-voice";
import type { Outcome, Voice } from "./voice";

export type Listener = {
  // Everything handed over has been said.
  drained(): void;
  // No voice for the language on this computer.
  noVoice(): void;
  // A sentence could not be played; the rest of the answer is dropped.
  failed(): void;
};

// What can go wrong with the voice (each has its own message): a sentence
// that could not be played, or no voice for the language spoken.
export type VoiceProblem = "voice-failed" | "no-voice";

// Piper in a browser that can run it; the browser's own voice elsewhere (the
// component checks have no workers) or when a click-through check asks for
// it (window.browserVoiceOnly, with its pretend browser voice).
function defaultVoice(): Voice {
  const only = (globalThis as { browserVoiceOnly?: boolean }).browserVoiceOnly;
  if (only || typeof Worker === "undefined") return new BrowserVoice();
  return new PiperVoice();
}

export class Speaker {
  // Sentences handed over in this round and not finished yet.
  private pending = 0;
  // stop() starts a new round; sentences of an older round are dropped.
  private round = 0;
  // Sentences are said one after another.
  private line: Promise<void> = Promise.resolve();
  // Ends the sentence being said, when stop() is called.
  private cut: (() => void) | null = null;
  private voice: Voice;

  constructor(voice: Voice = defaultVoice()) {
    this.voice = voice;
  }

  // Adds text after what is already being said.
  say(text: string, language: Language, listener: Listener): void {
    const round = this.round;
    this.pending += 1;
    this.voice.prepare?.(text, language);
    this.line = this.line.then(async () => {
      if (round !== this.round) return;
      const outcome = await this.speak(text, language);
      if (round !== this.round) return;
      if (outcome === "no-voice" || outcome === "failed") {
        this.stop();
        if (outcome === "failed") listener.failed();
        else listener.noVoice();
        return;
      }
      this.pending -= 1;
      if (this.pending === 0) listener.drained();
    });
  }

  // The voice test when Talk is pressed, in silence: checks that the
  // language spoken has a voice. Null when all is well; "stopped" when the
  // call ended meanwhile. A voice that cannot be played shows with the
  // first answer (failed).
  async test(language: Language): Promise<VoiceProblem | null | "stopped"> {
    const round = this.round;
    const has = await this.voice.has(language);
    if (round !== this.round) return "stopped";
    return has ? null : "no-voice";
  }

  stop(): void {
    this.round += 1;
    this.pending = 0;
    this.cut?.();
    this.cut = null;
    this.voice.cancel();
  }

  // One sentence, from the moment it is handed to the voice to its end.
  private async speak(text: string, language: Language): Promise<Outcome> {
    const round = this.round;
    return await this.voice.speak(text, language, {
      stillWanted: () => round === this.round,
      onCut: (cut) => {
        this.cut = cut;
      },
    });
  }
}
