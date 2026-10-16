// The voice call: follows the call rules (call.ts) and carries out what they
// ask with the ears (ears.ts) and the speaker. The coach's screen follows it
// with useVoiceCall (use-voice-call.ts).

import {
  type CallEvent,
  type CallState,
  type Effect,
  idleCall,
  step,
} from "./call";
import { type Ears, makeEars } from "./ears";
import type { Language } from "./languages";
import { playCue } from "./cue";
import { Speaker } from "./speaker";

// Where a finished turn goes, with the language it was said in.
export type SendTurn = (text: string, language: Language) => Promise<void>;

export class VoiceCall {
  private state = idleCall();
  private listeners = new Set<() => void>();
  private ears: Ears;
  private speaker: Speaker;
  private cue: () => void;
  private sendTurn: SendTurn = async () => {};

  constructor(
    ears: Ears = makeEars(),
    speaker = new Speaker(),
    cue: () => void = playCue,
  ) {
    this.ears = ears;
    this.speaker = speaker;
    this.cue = cue;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly current = (): CallState => this.state;

  // The voice bar: kept apart from the call's state, since it changes about
  // thirty times a second. 0 when not listening.
  private level = 0;
  private levelListeners = new Set<() => void>();

  readonly subscribeLevel = (listener: () => void): (() => void) => {
    this.levelListeners.add(listener);
    return () => this.levelListeners.delete(listener);
  };

  readonly currentLevel = (): number => this.level;

  private setLevel(level: number): void {
    if (level === this.level) return;
    this.level = level;
    for (const listener of this.levelListeners) listener();
  }

  // The screen tells the call where to send turns.
  sendTo(send: SendTurn): void {
    this.sendTurn = send;
  }

  start(): void {
    this.dispatch({ type: "start" });
  }

  // The language the owner speaks (the switch beside Talk): the ears write
  // their words down in it, and the AI answers in it.
  hearIn(language: Language): void {
    this.ears.hearIn(language);
    this.dispatch({ type: "language", language });
  }

  end(): void {
    this.dispatch({ type: "end" });
  }

  // The coach's spoken answer so far (final once the reply is complete): its
  // finished sentences are said while the rest is still being written.
  speech(text: string, final: boolean): void {
    this.dispatch({ type: "speech", text, final });
  }

  // The reply could not come (Claude could not be reached).
  failed(): void {
    this.dispatch({ type: "failed" });
  }

  private dispatch(event: CallEvent): void {
    const { state, effects } = step(this.state, event);
    if (state !== this.state) {
      this.state = state;
      for (const listener of this.listeners) listener();
    }
    for (const effect of effects) this.carryOut(effect);
  }

  private carryOut(effect: Effect): void {
    switch (effect.type) {
      case "prepare":
        this.prepare();
        return;
      case "test-voice":
        void this.speaker.test(effect.language).then((problem) => {
          if (problem !== "stopped") this.dispatch({ type: "tested", problem });
        });
        return;
      case "listen":
        this.listen();
        return;
      case "stop-listening":
        this.setLevel(0);
        this.ears.stop();
        return;
      case "quick":
        this.ears.quick(effect.on);
        return;
      case "hold":
        this.setLevel(0);
        this.ears.hold(effect.ms);
        return;
      case "cue":
        this.cue();
        return;
      case "send":
        this.sendTurn(effect.text, effect.language).catch(() => {
          this.dispatch({ type: "problem", problem: "not-sent" });
        });
        return;
      case "say":
        this.say(effect.text, effect.language);
        return;
      case "stop-voice":
        this.speaker.stop();
        return;
    }
  }

  private prepare(): void {
    void this.ears
      .prepare((fraction) => {
        this.dispatch({ type: "progress", fraction });
      })
      .then((problem) => {
        this.dispatch(
          problem ? { type: "problem", problem } : { type: "prepared" },
        );
      });
  }

  private listen(): void {
    void this.ears.start({
      voice: () => {},
      sentence: () => {
        this.dispatch({ type: "sentence" });
      },
      heard: (text, language) => {
        this.dispatch({ type: "heard", text, language });
      },
      level: (level) => {
        this.setLevel(level);
      },
      problem: (problem) => {
        this.dispatch({ type: "problem", problem });
      },
    });
  }

  private say(text: string, language: Language): void {
    this.speaker.say(text, language, {
      drained: () => {
        this.dispatch({ type: "drained" });
      },
      noVoice: () => {
        this.dispatch({ type: "problem", problem: "no-voice" });
      },
      failed: () => {
        this.dispatch({ type: "problem", problem: "voice-failed" });
      },
    });
  }
}
