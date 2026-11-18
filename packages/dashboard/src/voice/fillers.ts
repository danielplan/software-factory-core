// Whether a sentence the speech model wrote is only a filler it made up
// from silence, a breath or a noise ("uh", "thank you", "grazie"): not words
// for the conversation. The phrases Whisper imagines are in transcript.ts;
// here are the short sounds on top of them, in the voice's languages. Plain
// rules, used by the call rules in call.ts.

import { cleanTranscript, plainWords } from "./transcript.ts";

const SOUNDS = new Set([
  "uh",
  "um",
  "uhm",
  "eh",
  "hm",
  "hmm",
  "mm",
  "ah",
  "oh",
  // "äh" is "ah" without its accent.
  "ahm",
  "euh",
  "thanks",
  "danke",
  "ciao",
  "sottotitoli",
]);

export function isFiller(text: string): boolean {
  return !cleanTranscript(text) || SOUNDS.has(plainWords(text));
}
