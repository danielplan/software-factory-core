// The "already" check: before a new signal is shown, is there work for it
// already? An open exploration about the same thing, or a fix in the factory
// for the same thing. It only states a fact it found and never decides for
// anyone.
//
// For now this is a plain rule that gives the same answer every time: two
// texts are about the same thing when enough of their content words are the
// same. The kobold takes this over later and reads them the way a person
// would.

import type { Already, Exploration, KobbleSignal } from "./schemas.ts";

// Small words that say nothing about what a text is about.
const STOP_WORDS = new Set(
  (
    "the and for are but not you your yours with this that these those " +
    "there their they them then than was were has have had can could " +
    "would should will just from into onto about after before when what " +
    "where which while who whom why how all any some our ours out off " +
    "its it's she her him his hers too very also only once again here " +
    "does did doing done been being get got let lets like more most much " +
    "now one two way want wants need needs please thanks thank yes".trim()
  ).split(/\s+/),
);

// The content words of a text: in small letters, without punctuation,
// without short or stop words, plural "s" taken off, each once.
export function contentWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word))
    .map((word) =>
      word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word,
    );
  return new Set(words);
}

// How much of a text another one covers: the share of its words that the
// other has too (1 when it says nothing the other does not), and how many.
// Measured from the new signal, so a long exploration does not dilute it
// and a short one does not match everything.
export function covered(
  a: Set<string>,
  b: Set<string>,
): { score: number; shared: number } {
  const shared = [...a].filter((word) => b.has(word)).length;
  return { score: a.size === 0 ? 0 : shared / a.size, shared };
}

// Shared words over all the words of both: high only when the two texts say
// nearly the same.
export function jaccard(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((word) => b.has(word)).length;
  const all = a.size + b.size - shared;
  return all === 0 ? 0 : shared / all;
}

// A signal is about an exploration when the exploration covers at least
// half of the signal's words, and at least two of them.
const ABOUT = 0.5;
const AT_LEAST = 2;
// A fixed signal is the same thing when the two say nearly the same.
const SAME = 0.5;

// The work that exists already for this text, or null: the open exploration
// it is most about, else the fix of the signal it says nearly the same as.
export function alreadyFor(
  text: string,
  explorations: Exploration[],
  signals: KobbleSignal[],
): Already | null {
  const words = contentWords(text);
  const textOf = new Map(signals.map((signal) => [signal.id, signal.text]));
  let best: { score: number; exploration: Exploration } | null = null;
  for (const exploration of explorations) {
    if (!["waiting", "exploring"].includes(exploration.status)) continue;
    const told = [
      exploration.title,
      exploration.problem,
      ...exploration.signals.map((id) => textOf.get(id) ?? ""),
    ].join(" ");
    const { score, shared } = covered(words, contentWords(told));
    if (shared >= AT_LEAST && score >= ABOUT && score > (best?.score ?? 0))
      best = { score, exploration };
  }
  if (best)
    return {
      kind: "exploration",
      id: best.exploration.id,
      title: best.exploration.title,
    };
  const fixed = signals.find(
    (signal) =>
      signal.status === "fixed" &&
      signal.to !== null &&
      jaccard(words, contentWords(signal.text)) >= SAME,
  );
  return fixed?.to
    ? { kind: "work", id: fixed.to, title: titleOf(fixed.text) }
    : null;
}

const LONGEST_TITLE = 80;

// A short title from a text: its first sentence, without quotes around it,
// cut at a word when it is long.
export function titleOf(text: string): string {
  const plain = withoutQuotes(text.trim());
  const first = firstSentence(plain);
  const sentence = (first.endsWith(".") ? first.slice(0, -1) : first).trim();
  if (sentence.length <= LONGEST_TITLE) return sentence;
  const cut = sentence.slice(0, LONGEST_TITLE);
  const space = cut.lastIndexOf(" ");
  return `${(space > 20 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

// The text up to the first full stop, question or exclamation mark that
// ends a sentence (followed by a space or the end), or all of it.
function firstSentence(text: string): string {
  for (let at = 1; at < text.length; at++) {
    const next = text.charAt(at + 1);
    if (".?!".includes(text.charAt(at)) && (next === "" || next.trim() === ""))
      return text.slice(0, at + 1);
  }
  return text;
}

const QUOTES = `"“”„'‘’`;

function withoutQuotes(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && QUOTES.includes(text.charAt(start))) start++;
  while (end > start && QUOTES.includes(text.charAt(end - 1))) end--;
  return text.slice(start, end);
}
