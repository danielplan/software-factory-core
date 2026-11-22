// The post the kobold writes from what the person said: a clean title, a
// description, and what goes along (version, page, errors), with the team's
// data marked so the person can take it out.

import { CORE_VERSION } from "../../api/client.ts";

import type { CaughtError } from "./factory-errors";
import type { Kind } from "@/api/feedback-board";

export type Part = {
  id: string;
  label: "version" | "page" | "error";
  at?: string;
  text: string;
  removed: boolean;
};

export type Draft = { title: string; body: string; parts: Part[] };

// What a draft is written from.
export type Told = {
  kind: Kind;
  said: string;
  answers: string[];
  page: string;
  errors: CaughtError[];
  fromError: boolean;
};

// "Not sure" after "How often:" reads "not sure"; "I clicked" stays "I".
export const lowerFirst = (text: string) =>
  /^I\b/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);

const plain = (text: string) =>
  text.toLowerCase().replaceAll(/[^\p{L}\p{N}]+/gu, "");

const same = (a: string, b: string) => plain(a) === plain(b);

const sentence = (text: string) => {
  const trimmed = text.trim();
  const up = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?…]$/.test(up) ? up : `${up}.`;
};

// What in a text looks like a team's data: repositories, quoted titles,
// people's names. Marked so the person can take it out.
const TEAM_SHAPES = [
  String.raw`github\.com/[\w.-]+/[\w.-]+`,
  "“[^”]+”",
  '"[^"]+"',
  String.raw`\b[A-Z][a-z]+ [A-Z][a-z]+(?:'s)?\b`,
];
const TEAM = new RegExp(`(${TEAM_SHAPES.join("|")})`, "g");

// Takes out all that looks like the team's data from a text.
export const withoutTeam = (text: string, taken: string) =>
  text.replaceAll(TEAM, taken);

const REPOSITORY = /github\.com\/[\w.-]{1,100}\/[\w.-]{1,100}/g;
const QUOTED = /“[^”]{1,300}”|"[^"]{1,300}"|\(exit \d{1,5}\)/g;

// A quoted title (or an exit code) goes, with the space before it and "for card".
function withoutQuoted(text: string): string {
  const parts = text.replaceAll(QUOTED, "\0").split("\0");
  return parts
    .map((part, at) => {
      if (at === parts.length - 1) return part;
      const before = part.trimEnd();
      return (
        before.endsWith("for card") ? before.slice(0, -8) : before
      ).trimEnd();
    })
    .join("");
}

// A title never carries the team's data.
function withoutTeamData(text: string): string {
  return withoutQuoted(text).replaceAll(REPOSITORY, "the repository");
}

// The first sentence of a text (all of it when it has one only).
function firstSentence(text: string): string {
  for (let at = 0; at < text.length - 1; at++) {
    if (".!?".includes(text.charAt(at)) && /\s/.test(text.charAt(at + 1)))
      return text.slice(0, at + 1);
  }
  return text;
}

function withoutEnd(text: string): string {
  let end = text.length;
  while (end > 0 && ".!?".includes(text.charAt(end - 1))) end--;
  return text.slice(0, end);
}

// The wishes' usual openings, and what they say once cut.
const OPENINGS: [RegExp, string][] = [
  [/^i wish i could\s+/i, "Let me "],
  [/^i wish (kobble|it|the factory) (would|could)\s+/i, ""],
  [/^i wish there (was|were) (an? )?/i, "Add "],
  [/^(it would be|would be) (nice|great|good) if\s+/i, ""],
];

// A clean title from the person's words (English; others kept as said).
export function titleOf(said: string, kind: Kind): string {
  let title = withoutEnd(firstSentence(withoutTeamData(said)));
  for (const [opening, instead] of OPENINGS)
    title = title.replace(opening, instead);
  title = title.trim();
  if (kind === "bug") title = title.replace(/^error:\s*/i, "");
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title.length > 80 ? `${title.slice(0, 77)}…` : title;
}

// What opens the description: the error that was reported, nothing when the
// title says it all, or the person's own words.
function opening(at: Told): string | null {
  if (at.fromError) return "The factory hit the error below.";
  const titled = same(at.said, titleOf(at.said, at.kind));
  return at.answers.length > 0 && titled ? null : sentence(at.said);
}

// The post as it is so far.
export function draftOf(at: Told): Draft {
  return {
    title: titleOf(at.said, at.kind),
    // An error goes along below, where its team data can be taken out.
    body: [opening(at), ...at.answers.map(sentence)]
      .filter((one) => one !== null)
      .join("\n\n"),
    parts: [
      {
        id: "version",
        label: "version",
        text: `Kobble ${CORE_VERSION}`,
        removed: false,
      },
      { id: "page", label: "page", text: at.page, removed: false },
      ...at.errors.map((error) => ({
        id: `error-${String(error.id)}`,
        label: "error" as const,
        at: error.at,
        text: error.text,
        removed: false,
      })),
    ],
  };
}

// What goes out: the person's words, then what goes along (the parts they
// did not remove).
export function bodyOf(draft: Draft): string {
  const along = draft.parts
    .filter((part) => !part.removed)
    .map((part) => `- **${part.label}:** ${part.text}`);
  return along.length > 0
    ? `${draft.body}\n\n---\n\n${along.join("\n")}`
    : draft.body;
}

export function teamBits(text: string): { text: string; team: boolean }[] {
  const bits: { text: string; team: boolean }[] = [];
  let at = 0;
  for (const match of text.matchAll(TEAM)) {
    if (match.index > at)
      bits.push({ text: text.slice(at, match.index), team: false });
    bits.push({ text: match[0], team: true });
    at = match.index + match[0].length;
  }
  if (at < text.length) bits.push({ text: text.slice(at), team: false });
  return bits;
}
