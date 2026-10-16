// The speech model itself: Whisper, loaded from Hugging Face and kept by
// the browser. Each sentence is written down in the language the owner
// chose; without one, the model first guesses which of the voice's
// languages it is (languages.ts). Used by the worker (whisper-worker.ts) on
// the graphics card.

import {
  AutoProcessor,
  AutoTokenizer,
  type PreTrainedTokenizer,
  type Processor,
  Tensor,
  WhisperForConditionalGeneration,
} from "@huggingface/transformers";

import { type Language, LANGUAGE_CODES } from "./languages";
import { cleanTranscript, pickLanguage, pieces, tokenOf } from "./transcript";

// large-v3-turbo, the model openai/whisper recommends for speed with
// accuracy: smaller ones were found unreliable outside English. A download
// of about 0.8 GB, once.
export const MODEL = "onnx-community/whisper-large-v3-turbo";

export type Whisper = {
  tokenizer: PreTrainedTokenizer;
  processor: Processor;
  model: WhisperForConditionalGeneration;
};

type Progress = {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
};

type Config = {
  decoder_start_token_id: number;
  lang_to_id: Record<string, number>;
};

export async function loadWhisper(
  device: "webgpu" | "cpu",
  progress: (fraction: number | null) => void,
): Promise<Whisper> {
  const files = new Map<string, { loaded: number; total: number }>();
  const progress_callback = (step: Progress) => {
    if (step.status !== "progress" || !step.file || !step.total) return;
    files.set(step.file, { loaded: step.loaded ?? 0, total: step.total });
    let loaded = 0;
    let total = 0;
    for (const file of files.values()) {
      loaded += file.loaded;
      total += file.total;
    }
    progress(total ? loaded / total : null);
  };
  const [tokenizer, processor, model] = await Promise.all([
    AutoTokenizer.from_pretrained(MODEL, { progress_callback }),
    AutoProcessor.from_pretrained(MODEL, { progress_callback }),
    WhisperForConditionalGeneration.from_pretrained(MODEL, {
      device,
      dtype: { encoder_model: "q4", decoder_model_merged: "q4" },
      progress_callback,
    }),
  ]);
  return {
    tokenizer,
    processor,
    model: model as WhisperForConditionalGeneration,
  };
}

export async function writeDown(
  { tokenizer, processor, model }: Whisper,
  audio: Float32Array,
  chosen?: Language,
): Promise<{ text: string; language: Language }> {
  const config = model.generation_config as unknown as Config;
  let language: Language | null = chosen ?? null;
  const texts: string[] = [];
  for (const piece of pieces(audio)) {
    const inputs = (await processor(piece)) as Record<string, unknown>;
    language ??= await guessLanguage(model, inputs, config);
    const ids = (await model.generate({
      ...inputs,
      language,
      task: "transcribe",
      max_new_tokens: 440,
    } as Parameters<WhisperForConditionalGeneration["generate"]>[0])) as Tensor;
    texts.push(
      tokenizer.batch_decode(ids, { skip_special_tokens: true })[0] ?? "",
    );
  }
  return { text: cleanTranscript(texts.join(" ")), language: language ?? "en" };
}

// One step of the model from "start of transcript": its scores for the next
// word say which language it hears.
async function guessLanguage(
  model: WhisperForConditionalGeneration,
  inputs: Record<string, unknown>,
  config: Config,
): Promise<Language> {
  const start = new Tensor(
    "int64",
    BigInt64Array.from([BigInt(config.decoder_start_token_id)]),
    [1, 1],
  );
  const output = (await model({ ...inputs, decoder_input_ids: start })) as {
    logits: Tensor;
  } & Record<string, { dispose?(): void }>;
  const scores = output.logits.data as Float32Array;
  // The model's working memory from this step may live on the graphics card.
  for (const [name, value] of Object.entries(output))
    if (name !== "logits") value.dispose?.();
  const ids = Object.fromEntries(
    LANGUAGE_CODES.map((language) => [
      language,
      languageToken(config, language),
    ]),
  ) as Record<Language, number>;
  return pickLanguage(scores, ids);
}

// The model's word for "this is <language>".
function languageToken(config: Config, language: Language): number {
  const token = config.lang_to_id[tokenOf(language)];
  if (token === undefined)
    throw new Error(`The speech model does not know the language ${language}.`);
  return token;
}
