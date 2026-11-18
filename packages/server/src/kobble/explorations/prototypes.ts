// An exploration's prototypes, one per option, each the real product with
// that option in it, on its own branch `proto/X-<n>-<key>` in its own copy
// of the code: made by the kobold (Make, with the explore skill, like a
// version of an idea), run with the project's prototype command (Open, one
// at a time, through prototype mode), and used by a persona (Test). The
// copies are prototype mode's own (prototypes/copies.ts), next to the
// project.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  Board,
  Claude,
  Exploration,
  KobbleStore,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

import { versionCopy, versionWorkspace } from "../../prototypes/copies.ts";
import { PrototypeMode, type VersionRun } from "../../prototypes/mode.ts";
import { Refused } from "../../refused.ts";
import { linked, withThing } from "./board-things.ts";
import { codeMaps } from "./product-picture.ts";

const TIME_LIMIT_MS = 60 * 60_000;
const START_WITHIN_MS = 3 * 60_000;

// The prototype of an option, on the board.
export function prototypeOf(
  board: Board,
  key: string,
): Extract<Board["things"][number], { kind: "prototype" }> | null {
  for (const thing of board.things)
    if (thing.kind === "prototype" && thing.key === key) return thing;
  return null;
}

export function prototypeBranch(exploration: string, key: string): string {
  return `proto/${exploration}-${key.toLowerCase()}`;
}

type PrototypesOptions = {
  project: string;
  root: string;
  claude: Claude;
  store: () => KobbleStore;
  onChange: () => void;
};

export class ExplorationPrototypes {
  readonly mode: PrototypeMode;
  private readonly options: PrototypesOptions;

  constructor(options: PrototypesOptions) {
    this.options = options;
    this.mode = new PrototypeMode({
      project: options.project,
      root: options.root,
      onChange: options.onChange,
      copyOf: (exploration, key) => {
        const made = prototypeOf(options.store().board(exploration), key);
        if (!made)
          throw new Refused(`${exploration} has no prototype ${key} yet.`);
        return versionCopy(options.project, exploration, key, made.branch);
      },
    });
  }

  runs(exploration: string): VersionRun[] {
    return this.mode.view(exploration);
  }

  // Make: the option's prototype goes on the board at once, joined to its
  // choice by an arrow with its letter, and the kobold makes it in the
  // background.
  make(exploration: Exploration, choice: string, key: string): Board {
    const store = this.options.store();
    const board = store.board(exploration.id);
    const card = board.things.find((one) => one.id === choice);
    if (card?.kind !== "choice")
      throw new Refused(`There is no choice “${choice}” on the board.`);
    const option = card.options.find((one) => one.key === key);
    if (!option) throw new Refused(`${choice} has no option ${key}.`);
    if (prototypeOf(board, key))
      throw new Refused(`Option ${key} has a prototype already.`);
    const id = `prototype-${key.toLowerCase()}`;
    const saved = store.saveBoard(
      exploration.id,
      linked(
        withThing(board, {
          id,
          kind: "prototype",
          agreed: false,
          place: null,
          by: "person",
          ...option,
          branch: prototypeBranch(exploration.id, key),
          tests: [],
        }),
        choice,
        id,
        key,
      ),
    );
    this.mode.set(exploration.id, key, {
      state: "making",
      activity: "Starting",
      problem: null,
    });
    void this.making(exploration, saved, key).catch((error: unknown) => {
      this.mode.set(exploration.id, key, {
        state: "failed",
        activity: null,
        problem: error instanceof Error ? error.message : String(error),
      });
    });
    return saved;
  }

  // Open: this prototype runs, every other one stops (one at a time).
  async open(exploration: string, key: string): Promise<VersionRun> {
    for (const run of this.mode.view())
      if (
        !(run.idea === exploration && run.version === key) &&
        ["running", "starting"].includes(run.state)
      )
        await this.mode.stop(run.idea, run.version);
    return this.mode.start(exploration, key);
  }

  // Where it runs, started and waited for (for a persona test).
  async address(exploration: string, key: string): Promise<string> {
    await this.open(exploration, key);
    const until = Date.now() + START_WITHIN_MS;
    for (;;) {
      const run = this.mode.runOf(exploration, key);
      if (run.state === "running" && run.url) return run.url;
      if (run.state === "failed" || Date.now() > until)
        throw new Refused(
          `Prototype ${key} did not start: ${run.problem ?? "it took too long"}`,
        );
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  async stopAll(exploration: string): Promise<void> {
    for (const run of this.mode.view(exploration))
      if (["running", "starting"].includes(run.state))
        await this.mode.stop(run.idea, run.version);
  }

  close(): void {
    this.mode.close();
  }

  // The kobold's last words, on the prototype's card.
  private keepWords(exploration: string, key: string, said: string): void {
    const store = this.options.store();
    const board = store.board(exploration);
    const made = prototypeOf(board, key);
    if (made) store.saveBoard(exploration, withThing(board, { ...made, said }));
    this.options.onChange();
  }

  private async making(
    exploration: Exploration,
    board: Board,
    key: string,
  ): Promise<void> {
    const made = prototypeOf(board, key);
    if (!made) return;
    const copy = versionCopy(
      this.options.project,
      exploration.id,
      key,
      made.branch,
    );
    const workspace = await versionWorkspace(this.options.project, copy);
    const result = await this.options.claude.run({
      cwd: copy.folder,
      prompt: [
        `Make prototype ${key} of the exploration “${exploration.title}”, as the explore skill says, in this copy of the code (on the branch ${made.branch}).`,
        `The problem: ${exploration.problem}`,
        `The question it answers: ${questionOf(board, key)}`,
        `This prototype: ${made.name}. ${made.difference}`,
        codeMaps(this.options.root),
      ]
        .filter(Boolean)
        .join("\n\n"),
      readOnly: false,
      deny: ["Read(**/.env*)"],
      instructions: readFileSync(
        join(skillsFolder, "explore", "SKILL.md"),
        "utf8",
      ),
      session: { id: randomUUID(), resume: false },
      timeLimitMs: TIME_LIMIT_MS,
      onActivity: (line) => {
        this.mode.set(exploration.id, key, { activity: line.slice(0, 80) });
      },
    });
    const said = result.ok ? lastWords(result.text) : "";
    await workspace.commitAll(
      [`Prototype ${key} of ${exploration.id}: ${made.name}`, said]
        .filter(Boolean)
        .join("\n\n"),
    );
    if (said) this.keepWords(exploration.id, key, said);
    this.mode.set(
      exploration.id,
      key,
      result.ok
        ? { state: "stopped", activity: null, problem: null }
        : {
            state: "failed",
            activity: null,
            problem: `The kobold stopped: ${result.error ?? "Claude Code stopped"}. What it did so far is on ${made.branch}.`,
          },
    );
  }
}

// The kobold's last words: the end of its answer, a few lines at most.
export function lastWords(text: string): string {
  const paragraphs = text.trim().split(/\n\s*\n/);
  return (paragraphs.at(-1) ?? "").trim().slice(0, 600);
}

// The question of the choice an option belongs to.
function questionOf(board: Board, key: string): string {
  for (const thing of board.things)
    if (thing.kind === "choice" && thing.options.some((one) => one.key === key))
      return thing.title;
  return "not on the board";
}
