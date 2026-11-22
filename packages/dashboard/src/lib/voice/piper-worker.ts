// One of the AI's voices in its own background worker, so the page stays
// smooth: Piper, an open speaking model, turns a sentence into sound on this
// computer (piper-voice.ts). The voice's model is downloaded once from
// Hugging Face and kept by the browser; the engine files come with the
// dashboard. The library keeps one voice per worker, so each language has
// its own.

import { PATH_MAP, TtsSession } from "@mintplex-labs/piper-tts-web";
import piperData from "@diffusionstudio/piper-wasm/build/piper_phonemize.data?url";
import piperWasm from "@diffusionstudio/piper-wasm/build/piper_phonemize.wasm?url";
import engine from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

import { MORE_VOICES } from "./piper-voices";

// The voices the library does not list itself.
Object.assign(PATH_MAP, MORE_VOICES);

export type Ask = { id: number; voice: string; text: string };
export type Tell =
  | { id: number; audio: Blob }
  // fatal: the voice could not be loaded; this worker cannot speak.
  | { id: number; error: string; fatal: boolean };

let session: Promise<TtsSession> | null = null;

onmessage = async ({ data }: MessageEvent<Ask>) => {
  session ??= TtsSession.create({
    voiceId: data.voice,
    wasmPaths: {
      // The engine's own setting takes the file's address this way too.
      onnxWasm: { wasm: engine } as unknown as string,
      piperData,
      piperWasm,
    },
  });
  let ready: TtsSession;
  try {
    ready = await session;
  } catch (error) {
    tell({ id: data.id, error: messageOf(error), fatal: true });
    return;
  }
  try {
    tell({ id: data.id, audio: await ready.predict(data.text) });
  } catch (error) {
    tell({ id: data.id, error: messageOf(error), fatal: false });
  }
};

function tell(message: Tell): void {
  postMessage(message);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
