// The ears of the call: the microphone, the voice detector and the speech
// models together. They say when the owner starts talking, their words so
// far while they speak (about every half second, by the quick model,
// live-words.ts), when a sentence ended, and then the sentence's words, in
// the language the owner chose, by the accurate model; and, many times a
// second, how loud the microphone hears the owner (the voice bar). The
// accurate model starts writing as soon as the owner goes quiet for a
// moment, so at the pause the words are mostly there already and go out at
// once; if they speak again, that writing is let go. A check in the browser
// can put pretend ears in window.pretendEars, since it cannot speak into a
// microphone.

import { QUICK_PAUSE_MS, SEND_AFTER_PAUSE_MS } from "./call.ts";
import type { ModelProgress } from "./call-state.ts";
import type { Language } from "./languages.ts";
import { LiveWords, type Shown } from "./live-words.ts";
import {
  Microphone,
  MicrophoneError,
  type MicrophoneProblem,
} from "./microphone.ts";
import { type NotReady, Recogniser } from "./recogniser.ts";
import { type Detected, VoiceDetector, voiceLevel } from "./voice-detector.ts";

export type Hearing = {
  voice(): void;
  // The words so far while the owner speaks: settled, and still being heard.
  draft(words: Shown): void;
  sentence(): void;
  heard(text: string, language: Language): void;
  // How loud the microphone hears the owner now, from 0 to 1.
  level(level: number): void;
  problem(problem: MicrophoneProblem): void;
};

export interface Ears {
  // Null once ready to listen, or why it cannot be; meanwhile, how far each
  // speech model is.
  prepare(
    progress: (progress: ModelProgress) => void,
  ): Promise<NotReady | null>;
  start(hearing: Hearing): Promise<void>;
  // The language the owner speaks: the speech model writes in it instead of
  // guessing, which often went wrong on short sentences.
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

// True when this window may not use the microphone: the window's frame does
// not allow it, or the owner said no before.
async function microphoneBlocked(): Promise<boolean> {
  const { document, navigator } = globalThis as {
    document?: {
      permissionsPolicy?: { allowsFeature(name: string): boolean };
    };
    navigator?: { permissions?: Permissions };
  };
  const policy = document?.permissionsPolicy;
  if (policy && !policy.allowsFeature("microphone")) return true;
  const state = await navigator?.permissions
    ?.query({ name: "microphone" })
    .then((status) => status.state)
    .catch(() => null);
  return state === "denied";
}

// One pair of speech models for the whole page: they stay loaded while the
// owner looks at another tab and comes back.
let pageRecogniser: Recogniser | null = null;

function sharedRecogniser(): Recogniser {
  pageRecogniser ??= new Recogniser();
  return pageRecogniser;
}

type Listener = Pick<Microphone, "open" | "close">;

export class WhisperEars implements Ears {
  private microphone: Listener;
  private recogniser: Recogniser;
  private detector = new VoiceDetector(SEND_AFTER_PAUSE_MS);
  // Each start is a new listening; sentences of an older one are dropped.
  private listening = 0;
  // Until when the ears rest (hold).
  private restUntil = 0;
  private language: Language = "en";
  // The sentence being said; each sentence has its own, so a draft of an
  // earlier one is dropped.
  private live = new LiveWords();
  // The sentence written since the owner went quiet, if any.
  private early: Promise<string> | null = null;

  // The microphone and the speech models can be pretended by a test.
  constructor(
    microphone: Listener = new Microphone(),
    recogniser: Recogniser = sharedRecogniser(),
  ) {
    this.microphone = microphone;
    this.recogniser = recogniser;
  }

  async prepare(
    progress: (progress: ModelProgress) => void,
  ): Promise<NotReady | null> {
    if (await microphoneBlocked()) return "blocked";
    return this.recogniser.prepare(progress);
  }

  async start(hearing: Hearing): Promise<void> {
    this.stop();
    const listening = this.listening;
    this.quick(false);
    try {
      await this.microphone.open((frame) => {
        if (performance.now() < this.restUntil) {
          hearing.level(0);
          return;
        }
        hearing.level(voiceLevel(frame));
        for (const detected of this.detector.feed(frame))
          this.detected(detected, hearing, listening);
      });
    } catch (error) {
      if (this.listening !== listening) return;
      hearing.problem(
        error instanceof MicrophoneError ? error.problem : "microphone-failed",
      );
    }
  }

  private detected(
    detected: Detected,
    hearing: Hearing,
    listening: number,
  ): void {
    const still = () => this.listening === listening;
    switch (detected.type) {
      case "voice":
        hearing.voice();
        return;
      case "draft":
        this.draft(detected.audio, hearing, still);
        return;
      case "quiet":
        this.early = this.recogniser.writeEarly(detected.audio, this.language);
        return;
      case "sentence":
        this.sentence(detected, hearing, still);
    }
  }

  // The pause: the sentence written early, when it had all of the voice;
  // otherwise the accurate model writes it now.
  private sentence(
    { audio, early }: Extract<Detected, { type: "sentence" }>,
    hearing: Hearing,
    still: () => boolean,
  ): void {
    const language = this.language;
    const written =
      (early ? this.early : null) ?? this.recogniser.write(audio, language);
    this.early = null;
    this.live = new LiveWords();
    hearing.sentence();
    // A sentence the model could not write down counts as noise.
    const heard = (text: string) => {
      if (still()) hearing.heard(text, language);
    };
    written.then(heard, () => {
      heard("");
    });
  }

  // The words shown while the owner speaks; a draft that failed is skipped,
  // the next one comes half a second later.
  private draft(
    audio: Float32Array,
    hearing: Hearing,
    still: () => boolean,
  ): void {
    const live = this.live;
    this.recogniser.draft(audio, this.language)?.then(
      (text) => {
        const shown = still() && live === this.live ? live.show(text) : null;
        if (shown) hearing.draft(shown);
      },
      () => {},
    );
  }

  hearIn(language: Language): void {
    this.language = language;
  }

  // While the coach speaks, only "stop" matters: no drafts then.
  quick(on: boolean): void {
    this.detector.pauseMs = on ? QUICK_PAUSE_MS : SEND_AFTER_PAUSE_MS;
    this.detector.drafting = !on;
  }

  hold(ms: number): void {
    this.restUntil = performance.now() + ms;
    this.forget();
  }

  stop(): void {
    this.listening += 1;
    this.microphone.close();
    this.forget();
  }

  private forget(): void {
    this.detector.clear();
    this.live = new LiveWords();
    this.early = null;
  }
}
