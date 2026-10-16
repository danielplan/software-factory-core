// The page's side of the speech model: starts its worker
// (whisper-worker.ts) on first use, gets it ready, and asks it to write
// down each sentence in the language the owner speaks.

import type { Language } from "./languages";
import type { Ask, Tell } from "./whisper-worker";

export type NotReady = "unsupported" | "download";

export class Recogniser {
  private worker: Worker | null = null;
  private next = 0;
  private waiting = new Map<
    number,
    {
      resolve(text: string): void;
      reject(error: Error): void;
    }
  >();
  private preparing: {
    progress(fraction: number | null): void;
    done(problem: NotReady | null): void;
  } | null = null;

  // Null once the model is ready, or why it cannot be.
  prepare(
    progress: (fraction: number | null) => void,
  ): Promise<NotReady | null> {
    // Asks the browser not to clear the kept model when space runs low.
    const storage = (navigator as { storage?: Partial<StorageManager> })
      .storage;
    void storage?.persist?.().catch(() => false);
    return new Promise((done) => {
      this.preparing = { progress, done };
      this.ask({ type: "prepare" });
    });
  }

  write(audio: Float32Array, language: Language): Promise<string> {
    const id = (this.next += 1);
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ask({ type: "write", id, audio, language }, [
        audio.buffer as ArrayBuffer,
      ]);
    });
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
          return this.preparing?.progress(data.fraction);
        case "prepared": {
          this.finishPreparing(null);
          return;
        }
        case "problem": {
          this.finishPreparing(data.problem);
          return;
        }
        case "written":
          this.waiting.get(data.id)?.resolve(data.text);
          this.waiting.delete(data.id);
          return;
        case "failed":
          this.waiting.get(data.id)?.reject(new Error(data.details));
          this.waiting.delete(data.id);
      }
    };
    return worker;
  }

  private finishPreparing(problem: NotReady | null): void {
    this.preparing?.done(problem);
    this.preparing = null;
  }
}
