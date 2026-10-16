// The speech model's background worker, so the page stays smooth: Whisper
// (whisper-model.ts) run by Chrome on this computer's graphics card (WebGPU).
// The model is downloaded once from Hugging Face and kept by the browser
// (model-store.ts); the owner's voice never leaves the computer.

import { env } from "@huggingface/transformers";
import engineScript from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url";
import engineCode from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";

import type { Language } from "./languages";
import { ModelStore } from "./model-store";
import { loadWhisper, type Whisper, writeDown } from "./whisper-model";

// The engine that runs the model comes with the dashboard; left alone, the
// library would fetch it from a public CDN each time.
const engine = env.backends.onnx.wasm;
if (!engine) throw new Error("The speech engine has no settings to change.");
engine.wasmPaths = { mjs: engineScript, wasm: engineCode };
// The model's files are kept in the browser's file store (model-store.ts).
env.useBrowserCache = false;
env.useCustomCache = true;
const store = new ModelStore();
env.customCache = store;

export type Ask =
  | { type: "prepare" }
  | { type: "write"; id: number; audio: Float32Array; language: Language };

export type Tell =
  | { type: "progress"; fraction: number | null }
  | { type: "prepared" }
  | { type: "problem"; problem: "unsupported" | "download"; details: string }
  | { type: "written"; id: number; text: string; language: Language }
  | { type: "failed"; id: number; details: string };

const tell = (message: Tell) => {
  postMessage(message);
};
let whisper: Promise<Whisper> | null = null;
let queue: Promise<void> = Promise.resolve();

class Unsupported extends Error {}

async function load(): Promise<Whisper> {
  const gpu = (navigator as { gpu?: { requestAdapter(): Promise<unknown> } })
    .gpu;
  if (!gpu || !(await gpu.requestAdapter().catch(() => null)))
    throw new Unsupported("Chrome offers no WebGPU here.");
  // The library reports progress while reading the kept files too; only a
  // real download shows how far it is.
  return loadWhisper("webgpu", (fraction) => {
    tell({ type: "progress", fraction: store.downloading ? fraction : null });
  });
}

onmessage = async ({ data }: MessageEvent<Ask>) => {
  if (data.type === "prepare") {
    whisper ??= load();
    try {
      await whisper;
      tell({ type: "prepared" });
    } catch (error) {
      whisper = null;
      tell({
        type: "problem",
        problem: error instanceof Unsupported ? "unsupported" : "download",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  const { id, audio, language: spoken } = data;
  // The model takes one sentence at a time, in the order they were said.
  queue = queue.then(async () => {
    try {
      if (!whisper) throw new Error("The speech model is not ready.");
      const { text, language } = await writeDown(await whisper, audio, spoken);
      tell({ type: "written", id, text, language });
    } catch (error) {
      tell({
        type: "failed",
        id,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
