// The notes of a release: written from the pull requests merged since the
// last one, grouped by each card's type (never by what a title starts with),
// each entry linking its pull request.

import { CARD_TYPES, type CardType } from "../cards/cards.ts";

// One merged pull request. The type is its card's "type: …" label.
export type Merged = {
  number: number;
  title: string;
  url: string;
  type: CardType | null;
  body: string;
};

const HEADINGS: Record<CardType | "other", string> = {
  bug: "Fixes",
  feature: "New things",
  improvement: "Improvements",
  other: "Other changes",
};

// The notes in Markdown: the line saying why, then a section per type, in
// the order of CARD_TYPES, the untyped last. Empty sections are left out.
export function notesOf(why: string | null, merged: Merged[]): string {
  const sections = [...CARD_TYPES, "other" as const].flatMap((type) => {
    const entries = merged.filter((one) => (one.type ?? "other") === type);
    return entries.length === 0
      ? []
      : [
          `## ${HEADINGS[type]}`,
          entries
            .map(
              (one) => `- ${one.title} ([#${String(one.number)}](${one.url}))`,
            )
            .join("\n"),
        ];
  });
  return [...(why ? [why] : []), ...sections].join("\n\n") + "\n";
}
