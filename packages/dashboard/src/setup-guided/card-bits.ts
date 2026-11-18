// Small rules for showing the setup map's cards as the guided setup's
// tiles and rows: where a card says it came from, its text without that,
// what kind of thing it is, and a person's initials.

import type { Card } from "@/api";

// "… (AGENTS.md)" at the end of a card's text: the page it came from.
function split(card: Card): { text: string; source: string | null } {
  const text = (card.text ?? "").trimEnd();
  const open = text.lastIndexOf("(");
  if (!text.endsWith(")") || open === -1) return { text, source: null };
  const source = text.slice(open + 1, -1);
  if (source.length < 2 || source.length > 60 || source.includes("("))
    return { text, source: null };
  return { text: text.slice(0, open).trimEnd(), source };
}

export function sourceOf(card: Card): string | null {
  return split(card).source;
}

export function textOf(card: Card): string {
  return split(card).text;
}

// The line under a card: where it came from, a guess until agreed.
export function fromLine(card: Card): string {
  const source = sourceOf(card);
  if (card.confirmed) return source ? `from ${source}` : "agreed";
  return source ? `my guess, from ${source}` : "my guess";
}

// A program the factory builds: its card starts with its folder
// ("app-shop/ · …"); anything else is about the product (how real it is,
// what is open, folders that are not products).
const FOLDER = /^[\w.-]+(\/[\w.-]+)*\/ ·/;

export function isApp(card: Card): boolean {
  const text = card.text ?? "";
  return (
    card.tone !== "question" &&
    FOLDER.test(text) &&
    !/not a product/i.test(text)
  );
}

export function isPerson(card: Card): boolean {
  return card.icon === "person" || card.icon === "people";
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

// How far the product is, as the design asks it; the kobold's card says it
// in its own words, so the guess is read from those.
export const STAGES = [
  "An idea",
  "Built, not live yet",
  "Live, a few customers",
  "Live",
] as const;

export function stageOf(card: Card): (typeof STAGES)[number] {
  const words = `${card.title} ${card.text ?? ""}`.toLowerCase();
  if (
    /(not (yet )?(published|deployed|live|online)|nothing is published|only on this computer)/.test(
      words,
    )
  )
    return "Built, not live yet";
  if (/(few|first|pilot|test) customers/.test(words))
    return "Live, a few customers";
  if (/\b(idea|no code)\b/.test(words)) return "An idea";
  if (/\blive\b|customers use/.test(words)) return "Live";
  return "Built, not live yet";
}

export function isHowReal(card: Card): boolean {
  return /how (real|far)/i.test(card.title);
}

// An app's card: its folder in front ("app-shop/ · …") and its check at the
// end ("npm run verify") go into the line beneath; the rest is what it is.
export function appParts(card: Card): { text: string; from: string } {
  const text = textOf(card);
  const dot = text.indexOf(" · ");
  const folder = dot === -1 ? "" : text.slice(0, dot);
  const rest = withoutCheck(dot === -1 ? text : text.slice(dot + 3));
  const source = sourceOf(card);
  return {
    text: rest.endsWith(".") || rest === "" ? rest : `${rest}.`,
    from: [folder, source && `from ${source}`].filter(Boolean).join(" · "),
  };
}

// The text without the command that checks it at the end.
function withoutCheck(text: string): string {
  const at = text.toLowerCase().lastIndexOf("npm run ");
  if (at === -1 || text.slice(at).includes(" ", "npm run ".length + 1))
    return text.trim();
  const before = text.slice(0, at).trimEnd();
  const cut = before.toLowerCase().endsWith("checked with")
    ? before.slice(0, -"checked with".length)
    : before;
  let end = cut.length;
  while (end > 0 && ". ".includes(cut.charAt(end - 1))) end--;
  return cut.slice(0, end).trim();
}

// New words for a card's text, with its folder in front and its source at
// the end kept as they were.
export function withHidden(card: Card, words: string): string {
  const text = textOf(card);
  const dot = text.indexOf(" · ");
  const folder = isApp(card) && dot !== -1 ? `${text.slice(0, dot)} · ` : "";
  const source = sourceOf(card);
  const end = source ? ` (${source})` : "";
  return `${folder}${words}${end}`;
}
