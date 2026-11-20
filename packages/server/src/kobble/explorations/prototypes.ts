// An exploration's prototypes, frames of versions (versions.ts), each
// version the real product with one option or change in it, on its own
// branch `proto/X-<n>-<key>` in its own copy of the code: made by the kobold
// with the explore skill, run with the project's prototype command (Open,
// one at a time, through prototype mode), and used by a persona (Test). With
// a made-up world, the start command is told where the exploration's world
// answers (FACTORY_WORLD_URL). Each version is pushed to origin once made,
// so a teammate opens it too; when it cannot be, the board says so.

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
import { askFor } from "./making-words.ts";
import { finishMaking, type MadeReport, type Ready } from "./made.ts";

import { codeMaps } from "./product-picture.ts";
import {
  frameFor,
  freeKey,
  madeFor,
  namedArrow,
  versionOf,
  prototypeBranch,
  prototypeOf,
} from "./versions.ts";
import type { ExplorationWorlds } from "./worlds.ts";

const TIME_LIMIT_MS = 60 * 60_000;
const START_WITHIN_MS = 3 * 60_000;

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

  // Make: the option's prototype goes on the board at once and the kobold
  // makes it in the background. The choice's first one is a frame of its
  // own, joined to the choice by an arrow; the other options become
  // versions in that frame, and the arrow names them all.
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
    const frame = frameFor(board, choice);
    const name = freeKey(board, key);
    const id = `prototype-${name.toLowerCase()}`;
    const added = withThing(board, {
      id,
      kind: "prototype",
      agreed: false,
      place: null,
      by: "person",
      ...option,
      key: name,
      option: key,
      branch: prototypeBranch(exploration.id, name),
      tests: [],
      ...(frame ? { frame } : {}),
    });
    const saved = store.saveBoard(
      exploration.id,
      frame ? namedArrow(added, choice, frame) : linked(added, choice, id, key),
    );
    this.begin(exploration, saved, name);
    return saved;
  }

  // Another way: a new version in the same frame, made from the latest
  // main as the kobold describes it, beside the one it is another way to.
  another(
    exploration: Exploration,
    key: string,
    way: { name: string; difference: string },
  ): string {
    const store = this.options.store();
    const board = store.board(exploration.id);
    const base = prototypeOf(board, key);
    if (!base) throw new Refused(`There is no prototype ${key} on the board.`);
    const made = versionOf(board, exploration.id, base, way);
    this.begin(
      exploration,
      store.saveBoard(exploration.id, withThing(board, made)),
      made.key,
    );
    return made.key;
  }

  private begin(
    exploration: Exploration,
    board: Board,
    key: string,
    change?: { request: string; startFrom: string },
  ): void {
    this.mode.set(exploration.id, key, {
      state: "making",
      activity: change ? "Starting the change" : "Starting",
      problem: null,
    });
    void this.making(exploration, board, key, change).catch(
      (error: unknown) => {
        this.mode.set(exploration.id, key, {
          state: "failed",
          activity: null,
          problem: error instanceof Error ? error.message : String(error),
        });
      },
    );
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
  private ready: Ready = null;

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

  // Change: the kobold changes a prototype as asked, as a new version in
  // its frame, made from it on a branch of its own; the version it was
  // made from stays, so the team can switch back. The new version's key.
  change(exploration: Exploration, key: string, request: string): string {
    const store = this.options.store();
    const board = store.board(exploration.id);
    const base = prototypeOf(board, key);
    if (!base) throw new Refused(`There is no prototype ${key} on the board.`);
    if (this.mode.runOf(exploration.id, key).state === "making")
      throw new Refused(
        `Prototype ${key} is still being made: change it once it is ready.`,
      );
    const made = versionOf(board, exploration.id, base, {
      name: base.name,
      difference: request,
      from: base.key,
    });
    this.begin(
      exploration,
      store.saveBoard(exploration.id, withThing(board, made)),
      made.key,
      { request, startFrom: base.branch },
    );
    return made.key;
  }

  private async making(
    exploration: Exploration,
    board: Board,
    key: string,
    change?: { request: string; startFrom: string },
  ): Promise<void> {
    const made = prototypeOf(board, key);
    if (!made) return;
    const copy = versionCopy(
      this.options.project,
      exploration.id,
      key,
      made.branch,
    );
    const workspace = await versionWorkspace(
      this.options.project,
      copy,
      change?.startFrom,
    );
    const result = await this.options.claude.run({
      cwd: copy.folder,
      prompt: askFor(exploration, board, made, {
        change: change?.request,
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
    await finishMaking({
      mode: this.mode,
      workspace,
      exploration: exploration.id,
      made,
      change: change?.request,
      result,
      ready: this.ready,
    });
  }
}
