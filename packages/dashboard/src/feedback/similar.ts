// Finding the posts on the board that sound like what the person says.

import type { Kind, Post } from "./feedback-board";

// The posts on the board that sound like the text, the closest first.
export function findSimilarPosts(
  text: string,
  kind: Kind | null,
  posts: Post[],
  most = 2,
) {
  const words = [...new Set(wordsOf(text))];
  // Two shared words, when there are two to share ("board" alone is not
  // "export the board").
  const needed = Math.min(2, words.length);
  const score = (one: Post) => {
    const title = new Set(wordsOf(one.title));
    return words.filter((word) => title.has(word)).length;
  };
  return posts
    .filter(
      (one) =>
        (kind === null || one.kind === kind) &&
        needed > 0 &&
        score(one) >= needed,
    )
    .sort((a, b) => score(b) - score(a) || b.thumbs - a.thumbs)
    .slice(0, most);
}

// The words that say something, roughly stemmed ("stopped", "stops":
// "stop").
const COMMON = new Set([
  "about",
  "could",
  "every",
  "happen",
  "happened",
  "kobble",
  "often",
  "only",
  "please",
  "should",
  "that",
  "there",
  "this",
  "time",
  "when",
  "wish",
  "with",
  "would",
]);
function wordsOf(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 3 && !COMMON.has(word))
    .map((word) =>
      word
        .replace(/(ing|ed|es|s)$/, "")
        .replace(/([b-df-hj-np-tv-z])\1$/, "$1"),
    );
}
