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
import type { Photograph } from "../usage-pictures.ts";
import { Refused } from "../../refused.ts";
import { withThing } from "./board-things.ts";
import { askFor } from "./making-words.ts";
import { beingMadeIn, lookAndFix, lookAt, notWhileMade } from "./looks.ts";
import { finishMaking, type MadeReport, type Ready } from "./made.ts";

import { codeMaps } from "./product-picture.ts";
import {
  prototypeOf,
  shownAddress,
  choicePrototype,
  cutOffIn,
  cutRun,
  type Made,
  markedIn,
  freeVariant,
  withVariant,
} from "./versions.ts";
import type { ExplorationWorlds } from "./worlds.ts";

const TIME_LIMIT_MS = 60 * 60_000;
const START_WITHIN_MS = 3 * 60_000;

type PrototypesOptions = {
  // How a made prototype is photographed (Playwright, unless a test says).
  photograph?: Photograph;
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

  // How each prototype runs; one the factory closed on while it was being
  // made says so.
  runs(exploration: string): VersionRun[] {
    const cut = this.cutOff(exploration);
    const runs = this.mode.view(exploration);
    const known = new Set(runs.map((run) => run.version));
    return [
      ...runs.map((run) => (cut.has(run.version) ? cutRun(run) : run)),
      ...[...cut]
        .filter((key) => !known.has(key))
        .map((key) => cutRun(this.mode.runOf(exploration, key))),
    ];
  }

  // The prototypes marked as being made that no maker is on now.
  private cutOff(exploration: string): Set<string> {
    return cutOffIn(
      this.options.store().board(exploration),
      (key) => this.mode.runOf(exploration, key).making,
    );
  }

  // Make: a choice's options (all of them when none are named) as the
  // variants of one prototype, made at once in its one copy of the code.
  // It goes on the board at once, joined to the choice by an arrow, and the
  // kobold makes it in the background; when the choice has one already,
  // the options not made yet are added to it.
  make(
    exploration: Exploration,
    choice: string,
    keys: string[],
    opens?: string,
  ): Board {
    const store = this.options.store();
    const planned = choicePrototype(
      store.board(exploration.id),
      exploration.id,
      choice,
      keys,
      opens,
    );
    if (planned.change)
      notWhileMade(this.mode.runOf(exploration.id, planned.key));
    const saved = store.saveBoard(exploration.id, planned.board);
    this.begin(exploration, saved, planned.key, planned.change);
    return saved;
  }

  // Another way: a variant added to the prototype, made in its copy beside
  // the others; the new variant's letter.
  another(
    exploration: Exploration,
    key: string,
    way: { name: string; difference: string },
  ): string {
    const store = this.options.store();
    const board = store.board(exploration.id);
    const made = this.unbusy(board, exploration.id, key);
    const added = withVariant(made, { key: freeVariant(board, made), ...way });
    this.begin(
      exploration,
      store.saveBoard(exploration.id, withThing(board, added.made)),
      key,
      `Add variant ${added.key} (“${way.name}”): ${way.difference}. Keep the other variants as they are.`,
    );
    return added.key;
  }

  // A prototype that is not being made, or why it cannot be changed now.
  private unbusy(board: Board, exploration: string, key: string): Made {
    const made = prototypeOf(board, key);
    if (!made) throw new Refused(`There is no prototype ${key} on the board.`);
    notWhileMade(this.mode.runOf(exploration, key));
    return made;
  }

  private begin(
    exploration: Exploration,
    board: Board,
    key: string,
    change?: string,
  ): void {
    this.mode.set(exploration.id, key, {
      making: true,
      activity: change ? "Starting the change" : "Starting",
      problem: null,
    });
    this.mark(exploration.id, key, { making: true });
    void this.making(exploration, board, key, change).catch(
      (error: unknown) => {
        this.mark(exploration.id, key, {});
        this.mode.set(exploration.id, key, {
          making: false,
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
      if (run.state === "running" && run.url)
        return shownAddress(
          run.url,
          prototypeOf(this.options.store().board(exploration), key),
        );
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
    return beingMadeIn(this.mode.view(exploration));
  }

  // How it looks running, on the page it opens on, one picture a variant.
  private look(exploration: string, key: string, made: Made) {
    return lookAt({
      mode: this.mode,
      root: this.options.root,
      exploration,
      made: prototypeOf(this.options.store().board(exploration), key) ?? made,
      photograph: this.options.photograph,
    });
  }

  // Kept with the prototype: being made, or done (and the page the maker
  // said the change is on).
  private mark(
    exploration: string,
    key: string,
    now: { making?: boolean; opens?: string },
  ): void {
    const store = this.options.store();
    const marked = markedIn(store.board(exploration), key, now);
    if (marked) store.saveBoard(exploration, marked);
  }

  // Change: the kobold changes a prototype as asked, in its copy, a new
  // commit on its branch; it keeps running, and its page reloads as the
  // kobold changes it.
  change(exploration: Exploration, key: string, request: string): string {
    const store = this.options.store();
    const made = this.unbusy(store.board(exploration.id), exploration.id, key);
    const board = store.saveBoard(
      exploration.id,
      withThing(store.board(exploration.id), {
        ...made,
        changes: [...(made.changes ?? []), request.trim()],
      }),
    );
    this.begin(exploration, board, key, request);
    return key;
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
    // It runs while it is made: the team watches it change.
    this.mode.start(exploration.id, key).catch(() => undefined);
    const session = randomUUID();
    const ask = (prompt: string, resume: boolean) =>
      this.options.claude.run({
        cwd: copy.folder,
        prompt,
        readOnly: false,
        deny: ["Read(**/.env*)"],
        instructions: readFileSync(
          join(skillsFolder, "explore", "SKILL.md"),
          "utf8",
        ),
        session: { id: session, resume },
        timeLimitMs: TIME_LIMIT_MS,
        onActivity: (line) => {
          this.mode.set(exploration.id, key, { activity: line.slice(0, 80) });
        },
      });
    const asked = askFor(exploration, board, made, {
      change,
      maps: codeMaps(this.options.root),
    });
    const result = await lookAndFix(await ask(asked, false), {
      ask: (prompt) => ask(prompt, true),
      look: () => this.look(exploration.id, key, made),
      opens: (page) => {
        this.mark(exploration.id, key, { opens: page });
      },
    });
    this.mark(exploration.id, key, {});
    await finishMaking({
      mode: this.mode,
      workspace,
      exploration: exploration.id,
      made,
      change,
      result,
      ready: this.ready,
      look: () => this.look(exploration.id, key, made),
    });
  }
}
