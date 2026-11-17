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

const TIME_LIMIT_MS = 60 * 60_000;
const START_WITHIN_MS = 3 * 60_000;

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
      records: () => {
        throw new Refused("Explorations keep no records there.");
      },
      onChange: options.onChange,
      copyOf: (exploration, key) => {
        const made = options
          .store()
          .board(exploration)
          .prototypes.find((one) => one.key === key);
        if (!made)
          throw new Refused(`${exploration} has no prototype ${key} yet.`);
        return versionCopy(options.project, exploration, key, made.branch);
      },
    });
  }

  runs(exploration: string): VersionRun[] {
    return this.mode.view(exploration);
  }

  // Make: the option's prototype goes on the board at once, and the kobold
  // makes it in the background.
  make(exploration: Exploration, key: string): Board {
    const store = this.options.store();
    const board = store.board(exploration.id);
    const option = board.options.find((one) => one.key === key);
    if (!option) throw new Refused(`${exploration.id} has no option ${key}.`);
    if (board.prototypes.some((one) => one.key === key))
      throw new Refused(`Option ${key} has a prototype already.`);
    const branch = prototypeBranch(exploration.id, key);
    const saved = store.saveBoard(exploration.id, {
      ...board,
      prototypes: [
        ...board.prototypes,
        { ...option, branch, agreed: false, tests: [] },
      ].sort((a, b) => a.key.localeCompare(b.key)),
    });
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

  private async making(
    exploration: Exploration,
    board: Board,
    key: string,
  ): Promise<void> {
    const made = board.prototypes.find((one) => one.key === key);
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
        `The question: ${board.question}`,
        `This prototype: ${made.name}. ${made.difference}`,
      ].join("\n\n"),
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
      `Prototype ${key} of ${exploration.id}: ${made.name}`,
    );
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
