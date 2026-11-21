// The spec written at hand-off: Claude Code, reading the project, writes the
// card the builder builds from, in the shape of the plan skill's agreed plan
// (guide handoff-spec.md), from the exploration's conversation, its board,
// the agreed prototype and what its branch changes. The fixed summary
// (handoffText) is what it starts from, and what the card gets when it
// cannot write.

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Claude, Exploration, KobbleStore } from "@software-factory/core";
import { GIT } from "@software-factory/knowledge-base";
import { guidesFolder } from "@software-factory/skills";

import { boardText } from "./board-things.ts";
import { productPicture } from "./product-picture.ts";

// What the branch changes, at most this much of it: the rest is read in the
// code.
const MOST_DIFF = 60_000;
const TIME_LIMIT_MS = 10 * 60_000;
// Shorter than this is not a spec.
const LEAST_SPEC = 400;

export type SpecInput = {
  exploration: Exploration;
  // The fixed summary: problem, question, agreed prototype, what was learned.
  summary: string;
  // The agreed prototype's branch; none when the idea changes no screen.
  branch?: string;
};

export type SpecWriter = (input: SpecInput) => Promise<string | null>;

export function specWriter(options: {
  claude: Claude;
  project: string;
  root: string;
  store: () => KobbleStore;
  onActivity?: (line: string) => void;
}): SpecWriter {
  return async ({ exploration, summary, branch }) => {
    const store = options.store();
    const said = store
      .conversation(exploration.id)
      .messages.map(
        (m) => `${m.from === "kobold" ? "Explorer" : "Team"}: ${m.text}`,
      );
    const prompt = [
      `Write the spec for exploration ${exploration.id}, "${exploration.title}", as the guide says. Today is ${new Date().toISOString().slice(0, 10)}.`,
      "",
      "## What was agreed, in short",
      summary,
      "",
      "## The board",
      boardText(exploration, store.board(exploration.id)),
      "",
      "## The conversation",
      ...(said.length > 0 ? said : ["(none)"]),
      "",
      ...(branch
        ? [
            `## What the prototype's branch \`${branch}\` changes`,
            changesOf(options.project, branch),
          ]
        : [
            "## No prototype",
            "It changes no screen: the board says what to build.",
          ]),
      "",
      "## The products",
      productPicture(options.root, options.project),
    ].join("\n");
    const result = await options.claude.run({
      cwd: options.project,
      prompt,
      readOnly: true,
      tools: ["Read", "Grep", "Glob"],
      deny: ["Read(**/.env*)"],
      instructions: readFileSync(join(guidesFolder, "handoff-spec.md"), "utf8"),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: options.onActivity ?? (() => {}),
    });
    const spec = result.ok ? result.text.trim() : "";
    return spec.length >= LEAST_SPEC ? spec : null;
  };
}

// The files the branch changed and the change itself (cut short), since
// where it left the project's branch.
function changesOf(project: string, branch: string): string {
  const git = (...args: string[]) =>
    execFileSync(GIT, args, {
      cwd: project,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  try {
    const files = git("diff", "--stat", `HEAD...${branch}`);
    const change = git("diff", `HEAD...${branch}`);
    const cut =
      change.length > MOST_DIFF
        ? `${change.slice(0, MOST_DIFF)}\n… (cut short: the rest is in the code the branch changed)`
        : change;
    return `${files}\n${cut}`;
  } catch {
    return "(The branch could not be read here.)";
  }
}
