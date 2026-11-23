// What Sprocket proposes, written in its answer as a block the chat shows
// as a proposal card (components/proposal-card.tsx):
//
//   ```persona                        ```mission
//   name: Giulia                      persona: giulia
//   place: Founder · NOI, Bolzano     task: What they try, in a sentence.
//   about: Two or three sentences.    ```
//   ```
//
// The words before and after it stay as they are. While the answer is still
// being written, a block not closed yet is left out, so no half card shows.
// A block that misses what it needs stays plain text.

export type Block =
  | { kind: "persona"; name: string; place: string; about: string }
  | { kind: "mission"; persona: string; task: string };

export type Parts = { before: string; block: Block | null; after: string };

const KINDS = ["persona", "mission"] as const;
const OPENING = /```(persona|mission)[^\n]*\n/;
const FIELD = /^([a-z]+) ?:(.*)$/i;

// The block's fields by name; a field may go on over more lines.
function fieldsIn(body: string): Record<string, string> {
  const found: Record<string, string> = {};
  let last: string | null = null;
  for (const line of body.split("\n")) {
    const field = FIELD.exec(line.trim());
    if (field?.[1] && field[2] !== undefined) {
      last = field[1].toLowerCase();
      found[last] = field[2].trim();
    } else if (last && line.trim()) {
      found[last] = `${found[last] ?? ""} ${line.trim()}`.trim();
    }
  }
  return found;
}

function blockOf(kind: string, body: string): Block | null {
  const fields = fieldsIn(body);
  if (kind === "persona" && fields.name)
    return {
      kind,
      name: fields.name,
      place: fields.place ?? "",
      about: fields.about ?? "",
    };
  if (kind === "mission" && fields.persona && fields.task)
    return { kind, persona: fields.persona, task: fields.task };
  return null;
}

export function partsOf(text: string): Parts {
  const opening = OPENING.exec(text);
  const kind = KINDS.find((one) => one === opening?.[1]);
  if (!opening || !kind) return { before: text, block: null, after: "" };
  const before = text.slice(0, opening.index).trimEnd();
  const rest = text.slice(opening.index + opening[0].length);
  const closing = rest.indexOf("```");
  // Still being written: the words before it only.
  if (closing === -1) return { before, block: null, after: "" };
  const block = blockOf(kind, rest.slice(0, closing));
  if (!block) return { before: text, block: null, after: "" };
  return { before, block, after: rest.slice(closing + 3).trim() };
}
