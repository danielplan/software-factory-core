// A persona Sprocket proposes, written in its answer as a block:
//
//   ```persona
//   name: Giulia
//   place: NOI Techpark, Bolzano
//   about: Two or three sentences.
//   ```
//
// The chat shows the block as the persona's card (persona-card.tsx), with
// the words before and after it as they are. While the answer is still being
// written, a block not closed yet is left out, so no half card shows.

export type Proposal = { name: string; place: string; about: string };

export type Parts = {
  before: string;
  proposal: Proposal | null;
  after: string;
};

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

export function partsOf(text: string): Parts {
  const opening = OPENING.exec(text);
  if (!opening) return { before: text, proposal: null, after: "" };
  const before = text.slice(0, opening.index).trimEnd();
  const rest = text.slice(opening.index + opening[0].length);
  const closing = rest.indexOf("```");
  // Still being written: the words before it only.
  if (closing === -1) return { before, proposal: null, after: "" };
  const proposal = proposalIn(rest.slice(0, closing));
  if (!proposal) return { before: text, proposal: null, after: "" };
  return {
    before,
    proposal,
    after: rest.slice(closing + 3).trim(),
  };
}
