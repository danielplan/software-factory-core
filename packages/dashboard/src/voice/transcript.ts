// Plain rules around the speech model (whisper-worker.ts): which of the
// voice's languages a sentence was said in, which "words" are only the model
// imagining speech in noise, and how a long turn is cut into pieces the model
// can take.

import { type Language, LANGUAGE_CODES } from "./languages.ts";
import { SAMPLE_RATE } from "./voice-detector.ts";

// Whisper's token for a language ("<|de|>").
export const tokenOf = (language: Language) => `<|${language}|>`;

// The model's first guess is the language. Only the voice's languages
// count, so a sentence is never heard as, say, Portuguese.
export function pickLanguage(
  scores: ArrayLike<number>,
  ids: Record<Language, number>,
): Language {
  let best: Language = "en";
  for (const language of LANGUAGE_CODES)
    if ((scores[ids[language]] ?? -Infinity) > (scores[ids[best]] ?? -Infinity))
      best = language;
  return best;
}

// Phrases Whisper is known to "hear" in silence or noise, learned from
// subtitled videos. Alone, they are not the owner's words.
const IMAGINED = [
  "thank you",
  "thank you very much",
  "thanks for watching",
  "thank you for watching",
  "you",
  "bye",
  "grazie",
  "grazie a tutti",
  "grazie per la visione",
  "untertitel im auftrag des zdf",
  "vielen dank",
  "merci",
  "sous-titres realises par la communaute damaraorg",
  "gracias",
  "subtitulos realizados por la comunidad de amaraorg",
  "sottotitoli creati dalla comunita amaraorg",
  "sottotitoli a cura di qtss",
  "sottotitoli e revisione a cura di qtss",
];

export function cleanTranscript(text: string): string {
  const said = text.replace(/\s+/g, " ").trim();
  const plain = said
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .trim();
  return !plain || IMAGINED.includes(plain) ? "" : said;
}

// The model takes at most 30 seconds at a time.
const PIECE = 28 * SAMPLE_RATE;

export function pieces(audio: Float32Array): Float32Array[] {
  const parts: Float32Array[] = [];
  for (let start = 0; start < audio.length; start += PIECE)
    parts.push(audio.subarray(start, start + PIECE));
  return parts;
}
