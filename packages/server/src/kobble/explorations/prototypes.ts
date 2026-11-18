// An exploration's prototypes, one per option, each the real product with
// that option in it, on its own branch `proto/X-<n>-<key>` in its own copy
// of the code: made by the kobold (Make, with the explore skill, like a
// version of an idea), run with the project's prototype command (Open, one
// at a time, through prototype mode), and used by a persona (Test). The
// copies are prototype mode's own (prototypes/copies.ts), next to the
// project. When a product has a made-up world, the start command is told
// where the exploration's world answers (FACTORY_WORLD_URL, world-route.ts);
// opened for a persona that names a situation, the world starts from there.
// Each prototype is pushed to origin once made, so a teammate opens it from
// origin's branch (Workspace.prepareLocalBranch); when it cannot be, the
// board says so.

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
import type { ExplorationWorlds } from "./worlds.ts";

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

// Whether a choice's option has its prototype: the arrow from the choice,
// labelled with the option, to a prototype.
export function madeFor(board: Board, choice: string, key: string): boolean {
  return board.links.some(
    (link) =>
      link.from === choice &&
      link.label === key &&
      board.things.some(
        (thing) => thing.id === link.to && thing.kind === "prototype",
      ),
  );
}

// The option's letter, or with the first free number when another choice's
// option of that letter has a prototype (A2, A3 …).
export function freeKey(board: Board, key: string): string {
  for (let number = 1; ; number += 1) {
    const name = number === 1 ? key : `${key}${String(number)}`;
    if (!prototypeOf(board, name)) return name;
  }
}

export function prototypeBranch(exploration: string, key: string): string {
  return `proto/${exploration}-${key.toLowerCase()}`;
}

type PrototypesOptions = {
  project: string;
  root: string;
  claude: Claude;
  store: () => KobbleStore;
  worlds: ExplorationWorlds;
  onChange: () => void;
};

export class ExplorationPrototypes {
  readonly mode: PrototypeMode;
  private readonly options: PrototypesOptions;
  private worldUrl = "";

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
        const copy = versionCopy(
          options.project,
          exploration,
          key,
          made.branch,
        );
        return this.worldUrl && options.worlds.offered()
          ? {
              ...copy,
              env: {
                ...copy.env,
                FACTORY_WORLD_URL: `${this.worldUrl}/${exploration}`,
              },
            }
          : copy;
      },
    });
  }

  // Where the server answers the made-up worlds (the exploration's id is
  // added).
  serveWorldAt(url: string): void {
    this.worldUrl = url;
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
    if (madeFor(board, choice, key))
      throw new Refused(`Option ${key} has a prototype already.`);
    const name = freeKey(board, key);
    const id = `prototype-${name.toLowerCase()}`;
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
          key: name,
          branch: prototypeBranch(exploration.id, name),
          tests: [],
        }),
        choice,
        id,
        key,
      ),
    );
    this.mode.set(exploration.id, name, {
      state: "making",
      activity: "Starting",
      problem: null,
    });
    void this.making(exploration, saved, name).catch((error: unknown) => {
      this.mode.set(exploration.id, name, {
        state: "failed",
        activity: null,
        problem: error instanceof Error ? error.message : String(error),
      });
    });
    return saved;
  }

  // Open: this prototype runs, every other one stops (one at a time); for
  // a persona, in the world of its situation.
  async open(
    exploration: string,
    key: string,
    persona?: string,
  ): Promise<VersionRun> {
    this.options.worlds.startFor(exploration, persona);
    for (const run of this.mode.view())
      if (
        !(run.idea === exploration && run.version === key) &&
        ["running", "starting"].includes(run.state)
      )
        await this.mode.stop(run.idea, run.version);
    return this.mode.start(exploration, key);
  }

  // Where it runs, started and waited for (for a persona test).
  async address(
    exploration: string,
    key: string,
    persona?: string,
  ): Promise<string> {
    await this.open(exploration, key, persona);
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
    // Pushed, so a teammate can open it too; the board says when it is not.
    const unshared = notShared(await workspace.pushBranch(made.branch));
    if (said) this.keepWords(exploration.id, key, said);
    this.mode.set(
      exploration.id,
      key,
      result.ok
        ? { state: "stopped", activity: null, problem: unshared }
        : {
            state: "failed",
            activity: null,
            problem: stopped(result.error, made.branch, unshared),
          },
    );
  }
}

// Why the kobold stopped making it, and where its work is.
function stopped(
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
function notShared(why: string | null): string | null {
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
function questionOf(board: Board, key: string): string {
  for (const thing of board.things)
    if (thing.kind === "choice" && thing.options.some((one) => one.key === key))
      return thing.title;
  return "not on the board";
}
