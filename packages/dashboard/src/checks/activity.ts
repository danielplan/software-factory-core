// What the kobold does while it checks, in plain words in the person's
// language: the server passes on Claude Code's own line ("Reading
// apps/web/src/cart/Basket.svelte", "Searching for “(?i)pay|refund”"), which
// says too much and in code; here it becomes "Reading the code of “cart”…"
// or "Looking for “pay”, “refund”…". A search is never shown as written,
// only the plain words in it; what is not known becomes a general line.

import { t } from "../i18n/i18n.ts";

const READING = "Reading ";
const SEARCHING = "Searching for “";
const LOOKING = "Looking for files";
const WRITING = "Writing down a problem it found";

// Folders that say nothing of what a file is about.
const PLAIN_FOLDERS = new Set([
  "src",
  "lib",
  "app",
  "apps",
  "packages",
  "components",
  "routes",
  "pages",
  "source",
]);
const NOTES = /\.(md|mdx|txt)$/i;
const TESTS = /\.(test|spec)\.[a-z]+$|(^|\/)(tests?|__tests__)\//i;
// A plain word or words in a search: letters, digits, spaces and dashes.
const WORDS = /^\p{L}[\p{L}\p{N} _-]{2,29}$/u;

// The part of the product a file is in: its folder, or its own name when
// the folder says nothing.
function partOf(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const file = parts.pop() ?? path;
  const name = file.split(".")[0] || file;
  const folder = parts.at(-1);
  return folder && !PLAIN_FOLDERS.has(folder.toLowerCase()) ? folder : name;
}

function reading(path: string): string {
  if (path.includes(" ") || !path.includes("/"))
    return t("checks:running.looking");
  if (NOTES.test(path)) return t("checks:activity.notes");
  if (TESTS.test(path)) return t("checks:activity.tests");
  return t("checks:activity.reading", { part: partOf(path) });
}

// The plain words a search looks for, two at most; none when it is code.
export function searchedWords(pattern: string): string[] {
  const alternatives = pattern
    .replace(/^\(\?i\)/, "")
    .split("|")
    .map((one) => one.trim());
  return alternatives.filter((one) => WORDS.test(one)).slice(0, 2);
}

function searching(pattern: string): string {
  const words = searchedWords(pattern);
  if (words.length === 0) return t("checks:activity.searchingCode");
  return t("checks:activity.searching", {
    what: words.map((word) => `“${word}”`).join(", "),
  });
}

// What the kobold does now, in words; the general line when not known.
export function activityWords(activity: string | null): string {
  if (!activity) return t("checks:running.looking");
  if (activity.startsWith(SEARCHING))
    return searching(activity.slice(SEARCHING.length).replace(/”$/, ""));
  if (activity.startsWith(READING))
    return reading(activity.slice(READING.length).trim());
  if (activity.startsWith(LOOKING)) return t("checks:activity.files");
  if (activity.startsWith(WRITING)) return t("checks:activity.writing");
  return t("checks:running.looking");
}
