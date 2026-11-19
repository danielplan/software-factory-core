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
import { askFor, commitWords, notShared, stopped } from "./making-words.ts";

// A prototype the maker finished: its name, its thing on the board, what
// the maker said it did, and the files it changed.
export type MadeReport = {
  name: string;
  thing: string;
  said: string;
  files: string;
};
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

  // Who is told when a prototype is made (the conversation, which reviews
  // it and points at it): what the maker said it did, and the files it
  // changed.
  private ready:
    ((exploration: string, key: string, made: MadeReport) => void) | null =
    null;

  whenReady(
    ready: (exploration: string, key: string, made: MadeReport) => void,
  ): void {
    this.ready = ready;
  }

  // What each prototype of an exploration being made does now, for the
  // kobold who talks with the team.
  beingMade(exploration: string): string[] {
    return this.mode
      .view(exploration)
      .filter((run) => run.state === "making")
      .map((run) => {
        const doing = run.activity ? ` (${run.activity})` : "";
        return `${run.version}: being made${doing}`;
      });
  }

  // Change: the kobold changes an existing prototype as asked, a new
  // version on its branch; it is stopped meanwhile and shown being made.
  async change(
    exploration: Exploration,
    key: string,
    request: string,
  ): Promise<void> {
    const board = this.options.store().board(exploration.id);
    if (!prototypeOf(board, key))
      throw new Refused(`There is no prototype ${key} on the board.`);
    if (this.mode.runOf(exploration.id, key).state === "making")
      throw new Refused(`Prototype ${key} is being made already.`);
    await this.mode.stop(exploration.id, key);
    this.mode.set(exploration.id, key, {
      state: "making",
      activity: "Starting the change",
      problem: null,
    });
    void this.making(exploration, board, key, request).catch(
      (error: unknown) => {
        this.mode.set(exploration.id, key, {
          state: "failed",
          activity: null,
          problem: error instanceof Error ? error.message : String(error),
        });
      },
    );
  }

  private async making(
    exploration: Exploration,
    board: Board,
    key: string,
    change?: string,
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
      prompt: askFor(exploration, board, made, {
        change,
        maps: codeMaps(this.options.root),
      }),
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
    await workspace.commitAll(
      commitWords(exploration.id, made, change, result.ok ? result.text : ""),
    );
    // Pushed, so a teammate can open it too; the board says when it is not.
    const unshared = notShared(await workspace.pushBranch(made.branch));
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
    if (result.ok)
      this.ready?.(exploration.id, key, {
        name: change ? `changed: ${change}` : made.name,
        thing: made.id,
        said: result.text.trim().slice(0, 3000),
        files: (await workspace.changes()).slice(0, 2000),
      });
  }
}
