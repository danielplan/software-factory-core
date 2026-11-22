// How the factory and its agents recognise each other's words on the board.
// The owner and the factory may post with the same account, so every
// factory comment ends with a hidden mark naming what kind of note it is;
// an agent ends its answer with a line "STATUS: <value>".

export const NOTES = [
  "question",
  "plan-agreed",
  "blocked",
  "failed",
  "started",
  "progress",
  "moved-back",
  "review-ready",
  "fixed",
  "checks-failed",
  // The builder used its sessions in a row and is not finished yet: nothing
  // went wrong, and Continue gives it as many again.
  "out-of-sessions",
  // The answer to "did it work?", given in Kobble.
  "did-it-work",
  // Claude's usage limit: the card waits until it resets (untilOf).
  "paused",
  // The card's branch is open in a copy that is not the factory's: a person
  // works on it by hand, and the builder leaves the card to them.
  "by-hand",
] as const;
export type Note = (typeof NOTES)[number];

// Notes in the planning conversation. "moved-back", "progress" and "started" only
// announce, so they are not the factory's last word.
export const CONVERSATION_NOTES: readonly Note[] = [
  "question",
  "plan-agreed",
  "blocked",
  "failed",
];

// A failure is a technical problem, not a word in the conversation: an
// agreed plan before it still counts, so moving the card to Ready again
// tries again.
export const AGREEMENT_NOTES: readonly Note[] = CONVERSATION_NOTES.filter(
  (note) => note !== "failed",
);

// An earlier factory's notes, marked with its own name before "factory:"
// ("<!-- acme-factory:started -->"), are read too, so its cards carry on.
const MARKER = /<!-- [a-z-]{0,40}factory:([a-z-]+) -->\s*$/;

export function markComment(text: string, note: Note): string {
  return `${text.trimEnd()}\n\n<!-- software-factory:${note} -->`;
}

export function readNote(body: string): Note | null {
  const note = MARKER.exec(body)?.[1];
  return note && (NOTES as readonly string[]).includes(note)
    ? (note as Note)
    : null;
}

// A pause's end, written in its comment: <!-- software-factory:until <ISO> -->.
const UNTIL = /<!-- software-factory:until (\S+) -->/;

export function pausedComment(text: string, until: Date): string {
  return markComment(
    `${text.trimEnd()}\n\n<!-- software-factory:until ${until.toISOString()} -->`,
    "paused",
  );
}

export function untilOf(body: string): Date | null {
  const found = UNTIL.exec(body)?.[1];
  const date = found ? new Date(found) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

// A question in a shape the Factory page can answer: what the card is
// about, where the factory is, the question in plain words, two to four
// answers each with what it means in practice, and the factory's
// suggestion. Written by the agent as a hidden block in its comment.
export type Ask = {
  about: string;
  where: string;
  question: string;
  answers: { key: string; answer: string; means: string }[];
  suggested: string | null;
};

const ASK_START = "<!-- software-factory:ask";
const ASK_END = "-->";

// Where the ask block is in a comment, with its JSON; none without one.
function askBlock(
  body: string,
): { from: number; to: number; json: string } | null {
  const from = body.indexOf(ASK_START);
  if (from === -1) return null;
  const end = body.indexOf(ASK_END, from + ASK_START.length);
  if (end === -1) return null;
  return {
    from,
    to: end + ASK_END.length,
    json: body.slice(from + ASK_START.length, end),
  };
}

function withoutAsk(text: string): string {
  const block = askBlock(text);
  return block ? text.slice(0, block.from) + text.slice(block.to) : text;
}

export function readAsk(body: string): Ask | null {
  const found = askBlock(body)?.json;
  if (!found) return null;
  try {
    const read = JSON.parse(found) as Partial<Ask>;
    const answers = (read.answers ?? []).filter(
      (one) => typeof one.answer === "string" && one.answer.trim() !== "",
    );
    if (typeof read.question !== "string" || read.question.trim() === "")
      return null;
    return {
      about: typeof read.about === "string" ? read.about : "",
      where: typeof read.where === "string" ? read.where : "",
      question: read.question,
      answers: answers.slice(0, 4).map((one, at) => ({
        key:
          typeof one.key === "string" && one.key
            ? one.key
            : String.fromCharCode(65 + at),
        answer: one.answer,
        means: typeof one.means === "string" ? one.means : "",
      })),
      suggested: typeof read.suggested === "string" ? read.suggested : null,
    };
  } catch {
    return null;
  }
}

export function isFactory(body: string): boolean {
  return readNote(body) !== null;
}

export function stripMarker(body: string): string {
  const match = MARKER.exec(body);
  const text = match ? body.slice(0, match.index).trimEnd() : body;
  return withoutAsk(text.replace(UNTIL, "")).trimEnd();
}

// The answer and its last line's status ("STATUS: done"); no status when
// the last line is not one.
export function readStatusLine(output: string): {
  text: string;
  status: string | null;
} {
  const lines = output.trimEnd().split(/\r?\n/);
  const last = (lines.at(-1) ?? "").trim().replaceAll("*", "");
  const prefix = "status:";
  if (!last.toLowerCase().startsWith(prefix))
    return { text: output.trim(), status: null };
  const status = last.slice(prefix.length).trim().toLowerCase();
  if (!/^[a-z-]+$/.test(status)) return { text: output.trim(), status: null };
  return { text: lines.slice(0, -1).join("\n").trim(), status };
}

// An agent names screenshots and files by their path in the repository; on
// GitHub they need links into the branch, and pictures ?raw=true.
export function linkRepositoryFiles(
  text: string,
  repository: string,
  branch: string,
): string {
  return text.replace(
    /\]\((?!https?:|#|mailto:)([^)\s]+)\)/g,
    (_all, path: string) => {
      const clean = path.replace(/^\.?\//, "");
      const raw = /\.(png|jpe?g|gif|webp|svg)$/i.test(clean) ? "?raw=true" : "";
      return `](https://github.com/${repository}/blob/${branch}/${clean}${raw})`;
    },
  );
}
