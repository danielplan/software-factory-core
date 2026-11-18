// The page's side of the speech models: starts their worker
// (whisper-worker.ts) on first use, gets them ready, and asks the accurate
// one to write down each sentence in the language the owner speaks, and the
// quick one for drafts of the sentence so far while they speak. A draft, or
// a sentence written early, is skipped while its model is still busy.

import type { ModelName, ModelProgress } from "./call-state.ts";
import type { Language } from "./languages.ts";
import type { Ask, Tell } from "./whisper-worker.ts";

export type NotReady = "unsupported" | "download" | "blocked" | "stalled";

// Nothing happening for this long while getting ready is reported.
const STALLED_MS = 30_000;

export class Recogniser {
  private worker: Worker | null = null;
  private next = 0;
  private waiting = new Map<
    number,
    {
      resolve(answer: string): void;
      reject(error: Error): void;
    }
  >();
  private preparing: {
    progress(progress: ModelProgress): void;
    done(problem: NotReady | null): void;
  } | null = null;

  // Null once the model is ready, or why it cannot be.
  prepare(
    progress: (progress: ModelProgress) => void,
  ): Promise<NotReady | null> {
    // Asks the browser not to clear the kept model when space runs low.
    const storage = (navigator as { storage?: Partial<StorageManager> })
      .storage;
    void storage?.persist?.().catch(() => false);
    return new Promise((done) => {
      this.preparing = { progress, done };
      this.watch();
      this.ask({ type: "prepare" });
    });
  }

  private timer: ReturnType<typeof setTimeout> | undefined;

  // Starts the time-out again: called whenever something happens.
  private watch(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.finishPreparing("stalled");
    }, STALLED_MS);
  }

  write(audio: Float32Array, language: Language): Promise<string> {
    return this.job("write", audio, language);
  }

  // The sentence written early, when the owner went quiet; null while the
  // accurate model is still busy.
  writeEarly(audio: Float32Array, language: Language): Promise<string> | null {
    return this.busy.accurate > 0 ? null : this.write(audio, language);
  }

  // A draft of the sentence so far; null while the quick model is still
  // busy (the next draft comes half a second later).
  draft(audio: Float32Array, language: Language): Promise<string> | null {
    return this.busy.quick > 0 ? null : this.job("draft", audio, language);
  }

  // How many jobs each model has.
  private busy: Record<ModelName, number> = { quick: 0, accurate: 0 };

  private job(
    type: "write" | "draft",
    audio: Float32Array,
    language: Language,
  ): Promise<string> {
    const id = (this.next += 1);
    const model: ModelName = type === "draft" ? "quick" : "accurate";
    this.busy[model] += 1;
    const done = () => {
      this.busy[model] -= 1;
    };
    const job = new Promise<string>((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ask({ type, id, audio, language }, [audio.buffer as ArrayBuffer]);
    });
    job.then(done, done);
    return job;
  }

  private ask(message: Ask, transfer: Transferable[] = []): void {
    this.worker ??= this.start();
    this.worker.postMessage(message, transfer);
  }

  private start(): Worker {
    const worker = new Worker(new URL("./whisper-worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }: MessageEvent<Tell>) => {
      switch (data.type) {
        case "progress":
          if (!this.preparing) return;
          this.watch();
          this.preparing.progress(data.progress);
          return;
        case "prepared": {
          this.finishPreparing(null);
          return;
        }
        case "problem": {
          this.finishPreparing(data.problem);
          return;
        }
        case "written":
        case "drafted":
          this.waiting.get(data.id)?.resolve(data.text);
          this.waiting.delete(data.id);
          return;
        case "failed":
          this.waiting.get(data.id)?.reject(new Error(data.details));
          this.waiting.delete(data.id);
      }
    };
    // A worker that cannot even start would leave the owner waiting.
    worker.onerror = () => {
      this.finishPreparing("download");
    };
    return worker;
  }

  private finishPreparing(problem: NotReady | null): void {
    clearTimeout(this.timer);
    this.preparing?.done(problem);
    this.preparing = null;
  }
}
