// The speech models' background worker, so the page stays smooth: two
// Whisper models (whisper-model.ts), a quick one for the words shown while
// the owner speaks and an accurate one for the sentence, run by Chrome on
// this computer's graphics card (WebGPU). They are downloaded once from
// Hugging Face and kept by the browser (model-store.ts); the owner's voice
// never leaves the computer.

import { env } from "@huggingface/transformers";
import engineScript from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url";
import engineCode from "onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url";

import type { ModelName, ModelProgress } from "./call-state";
import type { Language } from "./languages";
import { ModelStore } from "./model-store";
import {
  DRAFT_MODEL,
  loadWhisper,
  MODEL,
  precisionOf,
  type Whisper,
  writeDown,
  writeDraft,
} from "./whisper-model";

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
  // The sentence, by the accurate model; the sentence so far while the
  // owner still speaks, by the quick one.
  | {
      type: "write" | "draft";
      id: number;
      audio: Float32Array;
      language: Language;
    };

export type Tell =
  | { type: "progress"; progress: ModelProgress }
  | { type: "prepared" }
  | { type: "problem"; problem: "unsupported" | "download"; details: string }
  | { type: "written"; id: number; text: string; language: Language }
  | { type: "drafted"; id: number; text: string }
  | { type: "failed"; id: number; details: string };

const tell = (message: Tell) => {
  postMessage(message);
};
let models: Promise<Record<ModelName, Whisper>> | null = null;
// Each model takes one job at a time, in the order they came; each has its
// own line, so a draft does not wait for a sentence being written.
const lines: Record<ModelName, Promise<void>> = {
  quick: Promise.resolve(),
  accurate: Promise.resolve(),
};

class Unsupported extends Error {}

async function load(): Promise<Record<ModelName, Whisper>> {
  const gpu = (
    navigator as {
      gpu?: {
        requestAdapter(): Promise<{ features?: Set<string> } | null>;
      };
    }
  ).gpu;
  const adapter = gpu ? await gpu.requestAdapter().catch(() => null) : null;
  if (!adapter) throw new Unsupported("Chrome offers no WebGPU here.");
  const halfNumbers = adapter.features?.has("shader-f16") ?? false;
  // Each model's own progress: a download, or reading the kept copy.
  const report =
    (model: ModelName, name: string) =>
    (fraction: number | null, bytes?: { loaded: number; total: number }) => {
      tell({
        type: "progress",
        progress: {
          model,
          fraction: fraction ?? 0,
          loaded: bytes?.loaded ?? 0,
          total: bytes?.total ?? 0,
          kept: !store.downloads(name),
        },
      });
    };
  const loaded = (model: ModelName, name: string) =>
    loadWhisper(
      "webgpu",
      report(model, name),
      name,
      precisionOf(name, halfNumbers),
    );
  const [accurate, quick] = await Promise.all([
    loaded("accurate", MODEL),
    loaded("quick", DRAFT_MODEL),
  ]);
  return { accurate, quick };
}

onmessage = async ({ data }: MessageEvent<Ask>) => {
  if (data.type === "prepare") {
    models ??= load();
    try {
      await models;
      tell({ type: "prepared" });
      // An earlier version's files are not needed any more.
      await store.keepOnlyUsed().catch(() => {});
    } catch (error) {
      models = null;
      tell({
        type: "problem",
        problem: error instanceof Unsupported ? "unsupported" : "download",
        details: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  const { id, audio, language: spoken } = data;
  const name: ModelName = data.type === "draft" ? "quick" : "accurate";
  const work = async () => {
    try {
      if (!models) throw new Error("The speech models are not ready.");
      const model = (await models)[name];
      if (data.type === "write") {
        const { text, language } = await writeDown(model, audio, spoken);
        tell({ type: "written", id, text, language });
      } else
        tell({
          type: "drafted",
          id,
          text: await writeDraft(model, audio, spoken),
        });
    } catch (error) {
      tell({
        type: "failed",
        id,
        details: error instanceof Error ? error.message : String(error),
      });
    }
  };
  lines[name] = lines[name].then(work);
};
