// The coach's voice: Piper, an open speaking model that runs in the browser
// on this computer, so the coach's words never leave it and sound natural
// (the computer's own voices sound metallic). Each
// language has its voice and its worker (piper-worker.ts), started when the
// language is first spoken; its model (about 60 MB) is downloaded once and
// kept by the browser. The next sentence is made while one is said. When a
// language's voice cannot be loaded (offline the first time, an old
// browser), the browser's own voice says it instead, so the AI is never
// silent.

import { type Language, LANGUAGES } from "./languages";

import { BrowserVoice } from "./browser-voice";
import type { Ask, Tell } from "./piper-worker";
import {
  type Outcome,
  type Saying,
  START_WITHIN_MS,
  type Voice,
} from "./voice";

type Job = {
  language: Language;
  resolve(audio: Blob): void;
  reject(error: Error): void;
};

export class PiperVoice implements Voice {
  private workers = new Map<Language, Worker>();
  private jobs = new Map<number, Job>();
  private next = 0;
  // Sentences being made or made, by language and words.
  private made = new Map<string, Promise<Blob>>();
  private playing: HTMLAudioElement | null = null;
  // Languages whose voice could not be loaded on this page.
  private unusable = new Set<Language>();
  private backup: Voice;

  constructor(backup: Voice = new BrowserVoice()) {
    this.backup = backup;
  }

  async has(language: Language): Promise<boolean> {
    return this.unusable.has(language) ? this.backup.has(language) : true;
  }

  prepare(text: string, language: Language): void {
    this.make(text, language).catch(() => {});
  }

  async speak(
    text: string,
    language: Language,
    saying: Saying,
  ): Promise<Outcome> {
    if (this.unusable.has(language))
      return await this.backup.speak(text, language, saying);
    let audio: Blob;
    try {
      audio = await this.make(text, language);
    } catch {
      if (this.unusable.has(language))
        return await this.backup.speak(text, language, saying);
      return "failed";
    } finally {
      this.made.delete(keyOf(text, language));
    }
    if (!saying.stillWanted()) return "stopped";
    return await this.play(audio, saying);
  }

  cancel(): void {
    this.playing?.pause();
    this.made.clear();
    this.backup.cancel();
  }

  private make(text: string, language: Language): Promise<Blob> {
    const key = keyOf(text, language);
    let audio = this.made.get(key);
    if (!audio) {
      const id = (this.next += 1);
      audio = new Promise<Blob>((resolve, reject) => {
        this.jobs.set(id, { language, resolve, reject });
      });
      const ask: Ask = { id, voice: LANGUAGES[language].piper, text };
      this.worker(language).postMessage(ask);
      this.made.set(key, audio);
    }
    return audio;
  }

  private worker(language: Language): Worker {
    let worker = this.workers.get(language);
    if (worker) return worker;
    worker = new Worker(new URL("./piper-worker.ts", import.meta.url), {
      type: "module",
      name: `voice-${language}`,
    });
    worker.onmessage = ({ data }: MessageEvent<Tell>) => {
      const job = this.jobs.get(data.id);
      this.jobs.delete(data.id);
      if ("audio" in data) job?.resolve(data.audio);
      else {
        job?.reject(new Error(data.error));
        if (data.fatal) this.drop(language, data.error);
      }
    };
    worker.onerror = (event) => {
      this.drop(language, event.message);
    };
    this.workers.set(language, worker);
    return worker;
  }

  // A worker that cannot speak: its language goes to the browser's voice.
  private drop(language: Language, reason: string): void {
    this.unusable.add(language);
    this.workers.get(language)?.terminate();
    this.workers.delete(language);
    for (const [id, job] of this.jobs)
      if (job.language === language) {
        this.jobs.delete(id);
        job.reject(new Error(reason));
      }
  }

  private play(audio: Blob, saying: Saying): Promise<Outcome> {
    const element = new Audio(URL.createObjectURL(audio));
    return new Promise<Outcome>((resolve) => {
      const end = (outcome: Outcome) => {
        clearTimeout(silent);
        element.pause();
        URL.revokeObjectURL(element.src);
        if (this.playing === element) this.playing = null;
        resolve(outcome);
      };
      // Silent too long: it counts as failed (the status line says so).
      const silent = setTimeout(() => {
        end("failed");
      }, START_WITHIN_MS);
      element.onplaying = () => {
        clearTimeout(silent);
      };
      element.onended = () => {
        end("said");
      };
      element.onerror = () => {
        end("failed");
      };
      saying.onCut(() => {
        end("stopped");
      });
      this.playing = element;
      element.play().catch(() => {
        end("failed");
      });
    });
  }
}

function keyOf(text: string, language: Language): string {
  return `${language}:${text}`;
}
