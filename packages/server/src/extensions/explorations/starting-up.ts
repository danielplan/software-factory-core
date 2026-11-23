// Starting a prototype in a project with no start command: Tinker works one
// out (start-setup.ts), one at a time, and the prototype starts as usual
// once there is one. A start Tinker worked out that stops coming up is
// worked out again, once; a start the team wrote is never touched. The
// prototype the start was worked out for is marked, so it carries Tinker's
// line, once; when Tinker cannot, its reason is kept with the prototype's
// run, for the page to say calmly.

import { randomUUID } from "node:crypto";

import {
  type Claude,
  type KobbleStore,
  makerModel,
} from "@software-factory/core";

import { versionWorkspace } from "../../prototypes/copies.ts";
import type { PrototypeMode, VersionRun } from "../../prototypes/mode.ts";
import { START_WITHIN_MS } from "./looks.ts";
import { askerFor } from "./maker-desk.ts";
import { setUpStart, startGuide } from "./start-setup.ts";
import { withStartSetUp } from "./versions.ts";

type Failed = { command: string; why: string };

export class StartUp {
  private readonly options: {
    project: string;
    root: string;
    claude: Claude;
    store: () => KobbleStore;
    mode: PrototypeMode;
  };
  // The start being worked out now, if any (one at a time).
  private settingUp: Promise<void> | null = null;

  constructor(options: StartUp["options"]) {
    this.options = options;
  }

  // Started: as usual with a start command; else it shows that it starts
  // while the start is worked out in the background.
  async open(exploration: string, key: string): Promise<VersionRun> {
    const { mode } = this.options;
    if (mode.canStart()) {
      const run = await mode.start(exploration, key);
      this.watch(exploration, key);
      return run;
    }
    const now = mode.runOf(exploration, key);
    if (now.state === "running" || now.state === "starting") return now;
    mode.set(exploration, key, {
      state: "starting",
      url: null,
      problem: null,
      startProblem: null,
      start: { step: "setup", line: null, since: new Date().toISOString() },
    });
    void this.setUp(exploration, key)
      .then(async () => {
        mode.set(exploration, key, { state: "stopped" });
        if (!mode.canStart()) return;
        await mode.start(exploration, key);
        this.watch(exploration, key);
      })
      .catch((error: unknown) => {
        mode.set(exploration, key, {
          state: "failed",
          problem: error instanceof Error ? error.message : String(error),
        });
      });
    return mode.runOf(exploration, key);
  }

  // Waits for the start being worked out, if there is one.
  async pending(): Promise<void> {
    await this.settingUp?.catch(() => undefined);
  }

  // A start Tinker worked out that does not come up any more: Tinker works
  // it out again, once, and the prototype starts again.
  private watch(exploration: string, key: string): void {
    const { mode } = this.options;
    const kept = mode.startOf();
    if (kept?.by !== "tinker") return;
    void this.cameUp(exploration, key)
      .then(async (up) => {
        if (up) return;
        await this.setUp(exploration, key, {
          command: kept.command,
          why: mode.runOf(exploration, key).problem ?? "it did not come up",
        });
        mode.set(exploration, key, { state: "stopped", problem: null });
        if (mode.startOf()?.command !== kept.command)
          await mode.start(exploration, key);
      })
      .catch(() => undefined);
  }

  // Whether the prototype came up; false once it failed. One stopped
  // meanwhile, or that takes too long, is not looked at any more (nothing
  // says the start is wrong).
  private async cameUp(exploration: string, key: string): Promise<boolean> {
    const until = Date.now() + START_WITHIN_MS;
    while (Date.now() < until) {
      const { state } = this.options.mode.runOf(exploration, key);
      if (state === "failed") return false;
      if (state !== "starting") return true;
      await new Promise((done) => setTimeout(done, 500));
    }
    return true;
  }

  // The project's start worked out by Tinker, one prototype at a time: what
  // another prototype asked for meanwhile waits for it. It is kept for the
  // whole team straight away, once the factory has seen it come up.
  async setUp(
    exploration: string,
    key: string,
    failed?: Failed,
  ): Promise<void> {
    if (this.settingUp) {
      await this.settingUp;
      return;
    }
    const { mode } = this.options;
    mode.set(exploration, key, {
      startProblem: null,
      ...(mode.runOf(exploration, key).making
        ? { activity: "Working out how to start the app" }
        : {}),
    });
    this.settingUp = this.setUpNow(exploration, key, failed);
    try {
      await this.settingUp;
    } finally {
      this.settingUp = null;
    }
  }

  private async setUpNow(
    exploration: string,
    key: string,
    failed?: Failed,
  ): Promise<void> {
    const { mode, project, root, claude, store } = this.options;
    const copy = mode.copyOf(exploration, key);
    const result = await versionWorkspace(project, copy).then(
      () =>
        setUpStart({
          root,
          project,
          mode,
          exploration,
          key,
          failed,
          ask: askerFor({
            claude,
            folder: copy.folder,
            model: makerModel(root),
            session: { id: randomUUID(), resume: false },
            mcp: undefined,
            browser: undefined,
            onStep: () => undefined,
            instructions: startGuide(),
          }),
        }),
      (error: unknown) => ({
        problem: error instanceof Error ? error.message : String(error),
      }),
    );
    if ("start" in result) {
      const board = withStartSetUp(store().board(exploration), key);
      if (board) store().saveBoard(exploration, board);
      mode.set(exploration, key, { startProblem: null });
    } else {
      mode.set(exploration, key, { startProblem: result.problem });
    }
  }
}
