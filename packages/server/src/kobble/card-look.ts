// What Sprocket sees of a card when the team asks about it: its text, its
// column, its conversation (the builder's notes and the people's comments),
// and, when the builder worked on it, its branch: the commits, the files it
// changes and the run file kept there. Read from the board and from git;
// nothing is changed. And the one thing Sprocket may do with a card: send
// the team's agreed answer to the builder on a stuck one, as Send on the
// Factory page does.

import { basename } from "node:path";

import { run } from "@software-factory/core";

import type { WorkView } from "../api.ts";
import { branchOf } from "../builder/branches.ts";
import { isFactory, stripMarker } from "../builder/protocol.ts";
import type { Cards } from "../cards/cards.ts";
import { Refused } from "../refused.ts";

export type SupportCards = {
  look: (number: number) => Promise<string>;
  answer: (number: number, text: string) => Promise<string>;
};

// Long texts keep their start and their end (a run file ends with its
// latest session).
const LONGEST = 6000;
const LAST_COMMENTS = 12;
const COMMITS = 15;

export function supportCards(options: {
  project: string;
  // The connected board; refused when there is none.
  cards: () => Cards;
  work: () => WorkView | null;
  answer: (number: number, text: string) => Promise<void>;
}): SupportCards {
  const stuckOne = (number: number) =>
    options.work()?.stuck?.find((one) => one.number === number);
  return {
    look: (number) =>
      cardLook(
        number,
        options.cards(),
        options.project,
        stuckOne(number)?.since ?? null,
      ),
    answer: async (number, text) => {
      if (!stuckOne(number))
        throw new Refused(
          `#${String(number)} is not stuck: only a stuck card is sent back to the builder from here.`,
        );
      await options.answer(number, text);
      return `Sent on #${String(number)}: it is in To do, and the builder carries on with it.`;
    },
  };
}

export async function cardLook(
  number: number,
  cards: Cards,
  project: string,
  stuckSince: string | null,
): Promise<string> {
  const card = await cards.show(number);
  const shown = card.comments.slice(-LAST_COMMENTS);
  const earlier = card.comments.length - shown.length;
  const said = shown.map((c) => {
    const who = isFactory(c.body) ? "Kobble's builder" : c.author;
    return `### ${who}, ${c.at}\n\n${clip(stripMarker(c.body))}`;
  });
  const where = stuckSince ? ` · stuck since ${stuckSince}` : "";
  return [
    `# #${String(number)} ${card.title}`,
    `${card.url} · column: ${card.column}${where}`,
    `## The card\n\n${clip(card.body.trim() || "(no text)")}`,
    `## The conversation${olderLeftOut(shown.length, earlier)}\n\n${said.join("\n\n") || "(no comments)"}`,
    await branchLook(project, number),
  ].join("\n\n");
}

async function branchLook(project: string, number: number): Promise<string> {
  const branch = branchOf(number);
  const git = (...args: string[]) => run("git", ["-C", project, ...args]);
  const remote = `origin/${branch}`;
  try {
    await git(
      "fetch",
      "--quiet",
      "origin",
      `+refs/heads/${branch}:refs/remotes/${remote}`,
    );
  } catch {
    return `## The branch\n\n\`${branch}\` has nothing yet: the builder has not pushed any work.`;
  }
  const base = await git("rev-parse", "--abbrev-ref", "origin/HEAD")
    .then((name) => name.trim())
    .catch(() => "origin/main");
  const commits = await git(
    "log",
    "--oneline",
    `-${String(COMMITS)}`,
    `${base}..${remote}`,
  );
  const changed = await git("diff", "--stat=100", `${base}...${remote}`);
  const runFiles = (await git("ls-tree", "--name-only", remote, "runs/"))
    .split("\n")
    .filter(
      (path) =>
        path.endsWith(".md") &&
        basename(path).startsWith(`issue-${String(number)}-`),
    );
  const runs = await Promise.all(
    runFiles.map(async (path) => {
      const text = await git("show", [remote, path].join(":"));
      return `### ${path}\n\n${clip(text)}`;
    }),
  );
  return [
    `## The branch \`${branch}\` (against ${base})`,
    `### Commits (latest first)\n\n${commits.trim() || "(none)"}`,
    `### Files it changes\n\n${clip(changed.trim()) || "(none)"}`,
    runs.length > 0 ? runs.join("\n\n") : "(no run file yet)",
  ].join("\n\n");
}

function olderLeftOut(shown: number, earlier: number): string {
  if (earlier === 0) return "";
  return ` (the last ${String(shown)}; ${String(earlier)} earlier)`;
}

function clip(text: string): string {
  if (text.length <= LONGEST) return text;
  const half = LONGEST / 2;
  return `${text.slice(0, half)}\n\n[… ${String(text.length - LONGEST)} characters left out …]\n\n${text.slice(-half)}`;
}
