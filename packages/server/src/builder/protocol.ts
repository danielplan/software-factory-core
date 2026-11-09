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

const MARKER = /<!-- software-factory:([a-z-]+) -->\s*$/;

export function markComment(text: string, note: Note): string {
  return `${text.trimEnd()}\n\n<!-- software-factory:${note} -->`;
}

export function readNote(body: string): Note | null {
  const note = MARKER.exec(body)?.[1];
  return note && (NOTES as readonly string[]).includes(note)
    ? (note as Note)
    : null;
}

export function isFactory(body: string): boolean {
  return readNote(body) !== null;
}

export function stripMarker(body: string): string {
  const match = MARKER.exec(body);
  return match ? body.slice(0, match.index).trimEnd() : body;
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
