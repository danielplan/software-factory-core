// The voice detector: notices from the microphone's loudness when the owner
// starts talking, hands over the sentence so far about every half second as
// a draft (for the words to show while they speak), the sentence again once
// they have been quiet for a moment (so it can be written down before the
// pause is over), and the sentence once they have been quiet for the pause,
// saying whether the moment's sentence already had all of its voice. It
// follows the room's own background level, so a fan or a quiet street is not
// taken for a voice. Plain rules, no browser parts.

export const SAMPLE_RATE = 16_000;
// The microphone's sound arrives in frames of 32 ms.
export const FRAME_SIZE = 512;
const FRAME_MS = (FRAME_SIZE / SAMPLE_RATE) * 1000;

// Louder than this and clearly above the room's level counts as a voice.
const MIN_LEVEL = 0.012;
const ABOVE_ROOM = 3;
// About 0.1 s of voice starts a sentence; about 0.3 s before it is kept, so
// the first syllable is not cut off.
const START_FRAMES = 3;
const BEFORE_FRAMES = 10;
// Shorter than about 0.2 s of voice is a cough or a click, not words.
const MIN_VOICE_FRAMES = 6;
// A draft of the sentence so far about every half second.
export const DRAFT_EVERY_MS = 500;
// Quiet for this long, the sentence is handed over to be written down
// early: shorter, more of the short breaths within a sentence would start a
// writing that is thrown away.
export const WRITE_EARLY_AFTER_MS = 300;
// One turn holds at most about three minutes.
const MAX_FRAMES = Math.round((3 * 60 * 1000) / FRAME_MS);

export type Detected =
  | { type: "voice" }
  | { type: "draft"; audio: Float32Array }
  // The owner went quiet: the sentence so far, to be written down early.
  | { type: "quiet"; audio: Float32Array }
  // early: the last "quiet" sentence had all of this one's voice.
  | { type: "sentence"; audio: Float32Array; early: boolean };

export class VoiceDetector {
  pauseMs: number;
  // Drafts and early sentences are handed over (not while the coach
  // speaks).
  drafting = true;
  private room = MIN_LEVEL / ABOVE_ROOM;
  private talking = false;
  private loudInARow = 0;
  private voiceFrames = 0;
  private quietMs = 0;
  private sinceDraftMs = 0;
  private before: Float32Array[] = [];
  private frames: Float32Array[] = [];
  private early = false;

  constructor(pauseMs: number) {
    this.pauseMs = pauseMs;
  }

  feed(frame: Float32Array): Detected[] {
    const level = loudness(frame);
    const loud = level > Math.max(MIN_LEVEL, this.room * ABOVE_ROOM);
    if (!this.talking) {
      if (!loud) this.room = this.room * 0.95 + level * 0.05;
      this.before.push(frame);
      if (this.before.length > BEFORE_FRAMES) this.before.shift();
      this.loudInARow = loud ? this.loudInARow + 1 : 0;
      if (this.loudInARow < START_FRAMES) return [];
      this.talking = true;
      this.frames = this.before;
      this.before = [];
      this.voiceFrames = this.loudInARow;
      this.quietMs = 0;
      return [{ type: "voice" }];
    }
    this.frames.push(frame);
    this.sinceDraftMs += FRAME_MS;
    if (loud) {
      this.voiceFrames += 1;
      this.quietMs = 0;
      this.early = false;
    } else this.quietMs += FRAME_MS;
    if (this.quietMs < this.pauseMs && this.frames.length < MAX_FRAMES)
      return [...this.draft(), ...this.quiet()];
    const words = this.voiceFrames >= MIN_VOICE_FRAMES;
    const audio = joined(this.frames);
    const early = this.early;
    this.clear();
    return words ? [{ type: "sentence", audio, early }] : [];
  }

  // The sentence so far, about every half second, once it has words.
  private draft(): Detected[] {
    if (
      !this.drafting ||
      this.sinceDraftMs < DRAFT_EVERY_MS ||
      this.voiceFrames < MIN_VOICE_FRAMES
    )
      return [];
    this.sinceDraftMs = 0;
    return [{ type: "draft", audio: joined(this.frames) }];
  }

  // The sentence so far, once each time the owner goes quiet.
  private quiet(): Detected[] {
    if (
      !this.drafting ||
      this.early ||
      this.quietMs < WRITE_EARLY_AFTER_MS ||
      this.voiceFrames < MIN_VOICE_FRAMES
    )
      return [];
    this.early = true;
    return [{ type: "quiet", audio: joined(this.frames) }];
  }

  // Forgets the sentence so far; the room's level is kept.
  clear(): void {
    this.talking = false;
    this.loudInARow = 0;
    this.voiceFrames = 0;
    this.quietMs = 0;
    this.sinceDraftMs = 0;
    this.early = false;
    this.before = [];
    this.frames = [];
  }
}

// How full the voice bar is (0 to 1): loudness on the decibel scale ears
// follow, from silence (about -55 dB) to a loud voice (about -10 dB).
const QUIETEST_DB = -55;
const LOUDEST_DB = -10;

export function voiceLevel(frame: Float32Array): number {
  const level = loudness(frame);
  if (level <= 0) return 0;
  const db = 20 * Math.log10(level);
  return Math.min(
    1,
    Math.max(0, (db - QUIETEST_DB) / (LOUDEST_DB - QUIETEST_DB)),
  );
}

function loudness(frame: Float32Array): number {
  let sum = 0;
  for (const sample of frame) sum += sample * sample;
  return Math.sqrt(sum / frame.length);
}

function joined(frames: Float32Array[]): Float32Array {
  const audio = new Float32Array(frames.length * FRAME_SIZE);
  frames.forEach((frame, index) => {
    audio.set(frame, index * FRAME_SIZE);
  });
  return audio;
}
