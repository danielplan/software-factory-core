// The microphone: opens it with the browser's echo cancellation and noise
// suppression, at the microphone's own rate, and hands its sound over in
// frames of 32 ms at 16 kHz, the rate the speech model listens at (the
// resampler converts it). Nothing is recorded or sent anywhere.

import { Resampler } from "./resampler";
import { FRAME_SIZE, SAMPLE_RATE } from "./voice-detector";

// What can stop the microphone from opening, each with its own message.
export type MicrophoneProblem =
  | "blocked" // the owner or the browser said no
  | "no-microphone" // none connected, or the headset's microphone is off
  | "microphone-busy" // another program holds it, or Windows could not open it
  | "microphone-failed"; // the browser could not handle its sound

export class MicrophoneError extends Error {
  problem: MicrophoneProblem;
  constructor(problem: MicrophoneProblem, cause: unknown) {
    super(
      cause instanceof Error
        ? `${cause.name}: ${cause.message}`
        : String(cause),
    );
    this.problem = problem;
  }
}

// The browser's own names for what went wrong.
export function microphoneProblem(error: unknown): MicrophoneProblem {
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "blocked";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "no-microphone";
  if (name === "NotReadableError" || name === "AbortError")
    return "microphone-busy";
  return "microphone-failed";
}

// A tiny audio worklet that turns the sound into frames for the speech
// model, with the resampler copied in. Written inline, so the build needs no
// extra file for it.
const FRAMES = `
const Resampler = (${Resampler.toString()});
class Frames extends AudioWorkletProcessor {
  constructor() {
    super();
    this.resampler = new Resampler(sampleRate, ${SAMPLE_RATE}, ${FRAME_SIZE});
  }
  process(inputs) {
    const sound = inputs[0] && inputs[0][0];
    if (sound)
      for (const frame of this.resampler.feed(sound)) this.port.postMessage(frame);
    return true;
  }
}
registerProcessor("factory-frames", Frames);
`;

export class Microphone {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  // Each open or close counts, so a close during opening wins.
  private turn = 0;

  // Rejects with a MicrophoneError saying what went wrong.
  async open(onFrame: (frame: Float32Array) => void): Promise<void> {
    this.close();
    const turn = this.turn;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      throw new MicrophoneError(microphoneProblem(error), error);
    }
    this.stream = stream;
    if (turn !== this.turn) {
      this.close();
      return;
    }
    try {
      // The microphone's own rate: the resampler makes the 16 kHz.
      const context = new AudioContext();
      this.context = context;
      const url = URL.createObjectURL(
        new Blob([FRAMES], { type: "text/javascript" }),
      );
      try {
        await context.audioWorklet.addModule(url);
      } finally {
        URL.revokeObjectURL(url);
      }
      if (turn !== this.turn) return;
      const frames = new AudioWorkletNode(context, "factory-frames");
      frames.port.onmessage = (event: MessageEvent<Float32Array>) => {
        onFrame(event.data);
      };
      // Connected to a silent output, so the browser keeps it running.
      const silent = context.createGain();
      silent.gain.value = 0;
      context.createMediaStreamSource(stream).connect(frames);
      frames.connect(silent).connect(context.destination);
      if (context.state === "suspended") await context.resume();
    } catch (error) {
      this.close();
      throw new MicrophoneError("microphone-failed", error);
    }
  }

  close(): void {
    this.turn += 1;
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    void this.context?.close();
    this.context = null;
  }
}
