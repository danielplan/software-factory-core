// The speech models themselves: two Whisper models, loaded from Hugging
// Face and kept by the browser. The accurate one writes down each sentence
// in the language the owner chose (without one, it first guesses which of
// the voice's languages it is, languages.ts); the quick one writes the
// drafts while they speak. Used by the worker (whisper-worker.ts) on the
// graphics card.

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

// A small, quick model (multilingual, so every language of the voice works)
// for the grey draft words while the owner speaks; the big one still writes
// the sentence. About 0.2 GB.
export const DRAFT_MODEL = "onnx-community/whisper-base";

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

// How each part of a model is stored: fewer bits download and run faster,
// more bits write more accurately.
export type Precision = {
  encoder_model: "fp32" | "fp16" | "q4" | "q4f16";
  decoder_model_merged: "fp32" | "fp16" | "q4" | "q4f16";
};

// Chosen by measurement. The accurate model: 4-bit, with 16-bit working
// numbers where the graphics card has them (q4f16): it wrote a sentence in
// about 1.7 s instead of 2.6 s, the same words, and downloads 0.56 GB
// instead of 0.76 GB; without them, plain 4-bit. The quick model keeps its
// encoder at 32 bits: at 16 it wrote nonsense.
export function precisionOf(name: string, halfNumbers: boolean): Precision {
  if (name !== MODEL)
    return { encoder_model: "fp32", decoder_model_merged: "q4" };
  return halfNumbers
    ? { encoder_model: "q4f16", decoder_model_merged: "q4f16" }
    : { encoder_model: "q4", decoder_model_merged: "q4" };
}

export async function loadWhisper(
  device: "webgpu" | "cpu",
  progress: (
    fraction: number | null,
    bytes?: { loaded: number; total: number },
  ) => void,
  name: string = MODEL,
  precision: Precision = precisionOf(name, false),
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
    progress(total ? loaded / total : null, { loaded, total });
  };
  const [tokenizer, processor, model] = await Promise.all([
    AutoTokenizer.from_pretrained(name, { progress_callback }),
    AutoProcessor.from_pretrained(name, { progress_callback }),
    WhisperForConditionalGeneration.from_pretrained(name, {
      device,
      dtype: precision,
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
  whisper: Whisper,
  audio: Float32Array,
  chosen?: Language,
): Promise<{ text: string; language: Language }> {
  const { processor, model } = whisper;
  const config = model.generation_config as unknown as Config;
  let language: Language | null = chosen ?? null;
  const texts: string[] = [];
  for (const piece of pieces(audio)) {
    const inputs = (await processor(piece)) as Record<string, unknown>;
    language ??= await guessLanguage(model, inputs, config);
    texts.push(await transcribe(whisper, inputs, language));
  }
  return { text: cleanTranscript(texts.join(" ")), language: language ?? "en" };
}

// A draft of the sentence so far, while the owner still speaks, in the
// language they chose. One pass of the model over at most one piece; longer,
// no draft (the pause writes it all).
export async function writeDraft(
  whisper: Whisper,
  audio: Float32Array,
  language: Language,
): Promise<string> {
  const [piece, ...more] = pieces(audio);
  if (!piece || more.length > 0) return "";
  const inputs = (await whisper.processor(piece)) as Record<string, unknown>;
  return cleanTranscript(await transcribe(whisper, inputs, language));
}

// One piece of sound, written down in the language given.
async function transcribe(
  { tokenizer, model }: Whisper,
  inputs: Record<string, unknown>,
  language: Language,
): Promise<string> {
  const ids = (await model.generate({
    ...inputs,
    language,
    task: "transcribe",
    max_new_tokens: 440,
  } as Parameters<WhisperForConditionalGeneration["generate"]>[0])) as Tensor;
  return tokenizer.batch_decode(ids, { skip_special_tokens: true })[0] ?? "";
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
