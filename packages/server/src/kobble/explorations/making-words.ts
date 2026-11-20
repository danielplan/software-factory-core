// What is said about making a prototype: what the maker is asked, its
// commit, why the kobold stopped and where its work is, when the team
// cannot open it, the kobold's last words, and the question an option
// answers.

import type { Board, Exploration } from "@software-factory/core";

type Made = Extract<Board["things"][number], { kind: "prototype" }>;

// Why the kobold stopped making it, and where its work is.
export function stopped(
  error: string | undefined,
  branch: string,
  unshared: string | null,
): string {
  return [
    `The kobold stopped: ${error ?? "Claude Code stopped"}. What it did so far is on ${branch}.`,
    unshared,
  ]
    .filter(Boolean)
    .join(" ");
}

// What the board says of a prototype the team cannot open; none when it was
// pushed.
export function notShared(why: string | null): string | null {
  return why
    ? `Only on this computer: it could not be shared with the team (${why}).`
    : null;
}

// The kobold's last words: the end of its answer, a few lines at most.
export function lastWords(text: string): string {
  const paragraphs = text.trim().split(/\n\s*\n/);
  return (paragraphs.at(-1) ?? "").trim().slice(0, 600);
}

// The question of the choice an option belongs to.
export function questionOf(board: Board, key: string): string {
  for (const thing of board.things)
    if (thing.kind === "choice" && thing.options.some((one) => one.key === key))
      return thing.title;
  return "not on the board";
}

// What the maker is asked: to make the prototype, or to change it as the
// team asked, with the problem, the question and the products' code maps.
export function askFor(
  exploration: Exploration,
  board: Board,
  made: Made,
  more: { change: string | undefined; maps: string },
): string {
  const { key, branch } = made;
  return [
    more.change
      ? `Change prototype ${key} of the exploration “${exploration.title}”, as the explore skill says, in this copy of the code (on the branch ${branch}, where it is already made). The change: ${more.change}. Keep what works; change what is asked.`
      : `Make prototype ${key} of the exploration “${exploration.title}”, as the explore skill says, in this copy of the code (on the branch ${branch}).`,
    `The problem: ${exploration.problem}`,
    `The question it answers: ${questionOf(board, key)}`,
    `This prototype: ${made.name}. ${made.difference}`,
    variantsWords(made),
    more.maps,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// A prototype's variants, all in this one copy, and how the one shown is
// chosen: outside the app, by the page address.
function variantsWords(made: Made): string {
  const variants = made.variants ?? [];
  if (variants.length < 2) return "";
  return [
    "Its variants, all in this one copy of the code:",
    ...variants.map((one) => `- ${one.key}. ${one.name}: ${one.difference}`),
    `Which one shows is chosen outside the app, by the page address: \`?variant=${variants[0]?.key ?? "A"}\` (the first one without it). Read it when the app loads and keep it for the visit (sessionStorage), so moving between pages keeps it. Nothing in the app shows or switches the variants. Share everything that is the same; only where the variants differ does the code ask which one shows.`,
  ].join("\n");
}

// The version's commit: which prototype, made or what was changed, and the
// kobold's last words.
export function commitWords(
  exploration: string,
  made: Made,
  change: string | undefined,
  answer: string,
): string {
  const title = change
    ? `Prototype ${made.key} of ${exploration}, changed: ${change}`
    : `Prototype ${made.key} of ${exploration}: ${made.name}`;
  return [title, lastWords(answer)].filter(Boolean).join("\n\n");
}
