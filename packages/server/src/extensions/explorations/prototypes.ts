// An exploration's prototypes, frames of versions (versions.ts), each
// version the real product with one option or change in it, on its own
// branch `proto/X-<n>-<key>` in its own copy of the code: made by the kobold
// with the explore skill, run with the project's prototype command (Open,
// one at a time, through prototype mode), and used by a persona (Test). With
// a made-up world, the start command is told where the exploration's world
// answers (FACTORY_WORLD_URL). Each version is pushed to origin once made,
// so a teammate opens it too; when it cannot be, the board says so.

import type {
  Board,
  Claude,
  Exploration,
  KobbleStore,
} from "@software-factory/core";

import { removeIdeaCopies, versionCopy } from "../../prototypes/copies.ts";
import { PrototypeMode, type VersionRun } from "../../prototypes/mode.ts";
import type { Photograph } from "../../kobble/usage-pictures.ts";
import { Refused } from "../../refused.ts";
import { withThing } from "./board-things.ts";
import { MakerDesk } from "./maker-desk.ts";
import { makeOne } from "./making.ts";
import type { MakerTools } from "./maker-tools.ts";
import { beingMadeIn, lookAt, notWhileMade, running } from "./looks.ts";
import type { Failed, Ready } from "./made.ts";

import {
  prototypeOf,
  shownAddress,
  choicePrototype,
  runsShown,
  type Made,
  markedIn,
  freeVariant,
  withVariant,
} from "./versions.ts";
import type { Browser } from "../../kobble/browser.ts";
import type { ExplorationWorlds } from "./worlds.ts";
import { deeperIn, type Way } from "./deeper.ts";

// How a change asked for starts: now (a new run), told (to the maker at
// work, in its run) or waits (for the run after it).
export type ChangeStart = "now" | "told" | "waits";

type PrototypesOptions = {
  // How a made prototype is photographed (Playwright, unless a test says).
  photograph?: Photograph;
  project: string;
  root: string;
  claude: Claude;
  // A browser for the maker to click through its prototype (Playwright's).
  browser?: () => Promise<Browser>;
  store: () => KobbleStore;
  worlds: ExplorationWorlds;
  onChange: () => void;
};

export class ExplorationPrototypes {
  readonly mode: PrototypeMode;
  // Where the makers' own tools are served.
  readonly desk = new MakerDesk();
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
  serveAt(base: string): void {
    this.worldUrl = `${base}/kobble/world`;
    this.desk.serveAt(`${base}/kobble/explorations/maker`);
  }

  // How each prototype runs; one the factory closed on while it was being
  // made says so.
  runs(exploration: string): VersionRun[] {
    return runsShown(
      this.options.store().board(exploration),
      (key) => this.mode.runOf(exploration, key),
      this.mode.view(exploration),
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

  // Dig deeper: the kept variant as the base, new variants refining it.
  deeper(exploration: Exploration, key: string, keep: string, ways: Way[]) {
    const store = this.options.store();
    const board = store.board(exploration.id);
    const dug = deeperIn(this.unbusy(board, exploration.id, key), keep, ways);
    const saved = store.saveBoard(exploration.id, withThing(board, dug.made));
    this.begin(exploration, saved, key, dug.request);
    return dug.keys;
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
      steps: [],
      problem: null,
    });
    this.mark(exploration.id, key, { making: true });
    void this.making(exploration, board, key, change).catch(
      (error: unknown) => {
        const problem = error instanceof Error ? error.message : String(error);
        this.mark(exploration.id, key, {});
        this.mode.set(exploration.id, key, {
          making: false,
          activity: null,
          problem,
        });
        this.failed?.(exploration.id, key, problem);
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
    const url = await running(this.mode, exploration, key).catch(
      (error: unknown) => {
        throw new Refused(
          `Prototype ${key} did not start: ${error instanceof Error ? error.message : String(error)}`,
        );
      },
    );
    return shownAddress(
      url,
      prototypeOf(this.options.store().board(exploration), key),
    );
  }

  // Handed off or dropped: its prototypes stop and their copies go; the
  // branches stay (the builder builds from the agreed one).
  async removeAll(exploration: string): Promise<void> {
    for (const run of this.mode.view(exploration))
      if (["running", "starting"].includes(run.state))
        await this.mode.stop(run.idea, run.version);
    removeIdeaCopies(this.options.project, exploration);
  }

  close(): void {
    this.mode.close();
  }

  // Who is told when a prototype is made (the conversation, which reviews
  // it and points at it) and when one could not be made (so it stops
  // saying the maker is on it).
  private ready: Ready = null;
  private failed: Failed = null;

  whenDone(told: { ready: Ready; failed: Failed }): void {
    this.ready = told.ready;
    this.failed = told.failed;
  }

  // What each prototype of an exploration being made does now, for the
  // kobold who talks with the team.
  beingMade(exploration: string): string[] {
    return beingMadeIn(this.mode.view(exploration));
  }

  // How it looks running, on the page it opens on (or another), one
  // picture a variant (or only one).
  private look(
    exploration: string,
    key: string,
    made: Made,
    want: { variant?: string; page?: string } = {},
  ) {
    const now =
      prototypeOf(this.options.store().board(exploration), key) ?? made;
    return lookAt({
      mode: this.mode,
      root: this.options.root,
      exploration,
      made: want.page ? { ...now, opens: want.page } : now,
      photograph: this.options.photograph,
      ...(want.variant ? { only: want.variant } : {}),
    });
  }

  // The maker's own tool: it looks at the prototype it makes.
  makerTools(exploration: string, key: string): MakerTools {
    const made = prototypeOf(this.options.store().board(exploration), key);
    if (!made) throw new Refused(`There is no prototype ${key} on the board.`);
    return this.desk.tools(exploration, key, (want) =>
      this.look(exploration, key, made, want),
    );
  }

  // Kept with the prototype: being made, or done (and the page the maker
  // said the change is on).
  private mark(
    exploration: string,
    key: string,
    now: { making?: boolean; opens?: string; states?: string[] },
  ): void {
    const store = this.options.store();
    const marked = markedIn(store.board(exploration), key, now);
    if (marked) store.saveBoard(exploration, marked);
  }

  // Change: the kobold changes a prototype as asked, in its copy, a new
  // commit on its branch; it keeps running, and its page reloads as the
  // kobold changes it.
  change(exploration: Exploration, key: string, request: string): ChangeStart {
    const store = this.options.store();
    const made = prototypeOf(store.board(exploration.id), key);
    if (!made) throw new Refused(`There is no prototype ${key} on the board.`);
    const board = store.saveBoard(
      exploration.id,
      withThing(store.board(exploration.id), {
        ...made,
        changes: [...(made.changes ?? []), request.trim()],
      }),
    );
    // Asked while the maker is on it: it waits, and starts by itself once
    // the maker is done.
    if (this.mode.runOf(exploration.id, key).making) {
      if (this.desk.tell(this.options.claude, exploration.id, key, request))
        return "told";
      this.desk.wait(exploration.id, key, request);
      return "waits";
    }
    this.begin(exploration, board, key, request);
    return "now";
  }

  private async making(
    exploration: Exploration,
    board: Board,
    key: string,
    change?: string,
  ): Promise<void> {
    const made = prototypeOf(board, key);
    if (!made) return;
    await makeOne({
      ...this.options,
      mode: this.mode,
      desk: this.desk,
      ready: this.ready,
      failed: this.failed,
      exploration,
      board,
      made,
      change,
      mark: (now) => {
        this.mark(exploration.id, key, now);
      },
      look: () => this.look(exploration.id, key, made),
    });
    const next = this.desk.waiting(exploration.id, key);
    const store = this.options.store();
    if (next) this.begin(exploration, store.board(exploration.id), key, next);
  }
}
