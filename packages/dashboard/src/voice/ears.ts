// The ears of the call: the microphone, the voice detector and the speech
// model together. They say when the owner starts talking, when a sentence
// ended (and is being written down), and then the sentence's words, in the
// language the owner chose; and, many times a second, how loud the
// microphone hears the owner (the voice bar). A check in the browser can put
// pretend ears in window.pretendEars, since it cannot speak into a
// microphone.

import { SEND_AFTER_PAUSE_MS, QUICK_PAUSE_MS } from "./call";
import type { Language } from "./languages";
import {
  Microphone,
  MicrophoneError,
  type MicrophoneProblem,
} from "./microphone";
import { type NotReady, Recogniser } from "./recogniser";
import { VoiceDetector, voiceLevel } from "./voice-detector";

export type Hearing = {
  voice(): void;
  sentence(): void;
  heard(text: string, language: Language): void;
  // How loud the microphone hears the owner now, from 0 to 1.
  level(level: number): void;
  problem(problem: MicrophoneProblem): void;
};

export interface Ears {
  // Null once ready to listen, or why it cannot be.
  prepare(
    progress: (fraction: number | null) => void,
  ): Promise<NotReady | null>;
  start(hearing: Hearing): Promise<void>;
  // The language the owner speaks: the speech model writes in it instead of
  // guessing, which often went wrong on short Italian sentences.
  hearIn(language: Language): void;
  // Shorter pauses end a sentence while the coach speaks.
  quick(on: boolean): void;
  // Rest for a moment: what is heard meanwhile is let go.
  hold(ms: number): void;
  stop(): void;
}

export function makeEars(): Ears {
  return (
    (globalThis as { pretendEars?: Ears }).pretendEars ?? new WhisperEars()
  );
}

// One speech model for the whole page: it stays loaded while the owner looks
// at another tab and comes back.
const recogniser = new Recogniser();

export class WhisperEars implements Ears {
  private microphone = new Microphone();
  private detector = new VoiceDetector(SEND_AFTER_PAUSE_MS);
  private recogniser = recogniser;
  // Each start is a new listening; sentences of an older one are dropped.
  private listening = 0;
  // Until when the ears rest (hold).
  private restUntil = 0;
  private language: Language = "en";

  prepare(
    progress: (fraction: number | null) => void,
  ): Promise<NotReady | null> {
    return this.recogniser.prepare(progress);
  }

  async start(hearing: Hearing): Promise<void> {
    this.stop();
    const listening = this.listening;
    this.detector.pauseMs = SEND_AFTER_PAUSE_MS;
    try {
      await this.microphone.open((frame) => {
        if (performance.now() < this.restUntil) {
          hearing.level(0);
          return;
        }
        hearing.level(voiceLevel(frame));
        for (const detected of this.detector.feed(frame)) {
          if (detected.type === "voice") hearing.voice();
          else {
            hearing.sentence();
            const language = this.language;
            this.recogniser.write(detected.audio, language).then(
              (text) => {
                if (this.listening === listening) hearing.heard(text, language);
              },
              // A sentence the model could not write down counts as noise.
              () => {
                if (this.listening === listening) hearing.heard("", language);
              },
            );
          }
        }
      });
    } catch (error) {
      if (this.listening !== listening) return;
      hearing.problem(
        error instanceof MicrophoneError ? error.problem : "microphone-failed",
      );
    }
  }

  hearIn(language: Language): void {
    this.language = language;
  }

  quick(on: boolean): void {
    this.detector.pauseMs = on ? QUICK_PAUSE_MS : SEND_AFTER_PAUSE_MS;
  }

  hold(ms: number): void {
    this.restUntil = performance.now() + ms;
    this.detector.clear();
  }

  stop(): void {
    this.listening += 1;
    this.microphone.close();
    this.detector.clear();
  }
}
