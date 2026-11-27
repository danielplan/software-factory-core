// The personas Sprocket proposes, each written in its answer as a block:
//
//   ```persona
//   name: Giulia
//   place: NOI Techpark, Bolzano
//   about: Two or three sentences.
//   ```
//
// The chat shows each block as the persona's card (persona-card.tsx), with
// the words between them as they are; several personas are several blocks,
// each its own card. While the answer is still being written, a block not
// closed yet is left out, so no half card shows.

export type Proposal = { name: string; place: string; about: string };

// The answer in order: its words, and a card for each persona block.
export type Part = { text: string } | { proposal: Proposal };

const OPENING = /```persona[^\n]*\n/;
const FIELD = /^(name|place|about) ?:(.*)$/i;

// The block's fields; the about may go on over more lines.
function proposalIn(block: string): Proposal | null {
  const found: Record<string, string> = {};
  let last: string | null = null;
  for (const line of block.split("\n")) {
    const field = FIELD.exec(line.trim());
    if (field?.[1] && field[2] !== undefined) {
      last = field[1].toLowerCase();
      found[last] = field[2].trim();
    } else if (last && line.trim()) {
      found[last] = `${found[last] ?? ""} ${line.trim()}`.trim();
    }
  }
  const name = found.name ?? "";
  if (!name) return null;
  return { name, place: found.place ?? "", about: found.about ?? "" };
}

export function partsOf(text: string): Part[] {
  const parts: Part[] = [];
  const said = (words: string) => {
    if (words.trim()) parts.push({ text: words.trim() });
  };
  let rest = text;
  for (;;) {
    const opening = OPENING.exec(rest);
    if (!opening) break;
    const inside = rest.slice(opening.index + opening[0].length);
    const closing = inside.indexOf("```");
    // Still being written: the words before it only.
    if (closing === -1) {
      said(rest.slice(0, opening.index));
      return parts;
    }
    const proposal = proposalIn(inside.slice(0, closing));
    const end = opening.index + opening[0].length + closing + 3;
    if (proposal) {
      said(rest.slice(0, opening.index));
      parts.push({ proposal });
    } else said(rest.slice(0, end));
    rest = rest.slice(end);
  }
  said(rest);
  return parts;
}

export const proposalsIn = (text: string): Proposal[] =>
  partsOf(text).flatMap((part) => ("proposal" in part ? [part.proposal] : []));
