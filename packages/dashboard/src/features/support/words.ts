// Words that sound like a wish or something wrong, in three languages
// (English, Italian, German).

// A phrase is a regular expression's source; a `*` ends a word that goes on.
const BUG_PHRASES = [
  "bug",
  "broken",
  "doesn'?t work",
  "does not work",
  "not working",
  "crash\\w*",
  "error",
  "stops?",
  "stuck",
  "wrong",
  "fails?",
  "non funziona",
  "errore",
  "si blocca",
  "funktioniert nicht",
  "fehler",
  "kaputt",
  "hängt",
];

const WISH_PHRASES = [
  "i wish",
  "wish",
  "would be nice",
  "would be great",
  "would be good",
  "would be cool",
  "it would help",
  "would love",
  "please add",
  "could you add",
  "missing",
  "feedback",
  "vorrei",
  "sarebbe bello",
  "wünsch\\w*",
  "wäre schön",
  "wäre gut",
];

const wordsLike = (phrases: string[]) =>
  new RegExp(String.raw`\b(?:${phrases.join("|")})\b`, "i");

const BUG = wordsLike(BUG_PHRASES);
const FEEDBACK = wordsLike([...WISH_PHRASES, ...BUG_PHRASES]);

export const isBugWords = (text: string) => BUG.test(text);

export function looksLikeFeedback(text: string): boolean {
  return FEEDBACK.test(text);
}
