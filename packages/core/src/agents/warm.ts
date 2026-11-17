// Claude Code kept open between the turns of a conversation, for a coach's
// chat: starting Claude Code costs about 5 seconds, so a fresh
// start on every turn makes the owner wait. Used like Claude.run: each
// conversation (session id) keeps its own Claude Code process, which takes the
// turns over standard input (stream-json) one at a time and closes after a
// while without turns. A process that stopped is started again on the next
// turn and continues the same conversation. When Claude Code is not there to
// start (it updates itself, so it is gone for a few seconds), a turn waits and
// tries again a few times before it says so; one that started is never tried
// again.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import { describeEvent } from "./activity.ts";
import { claudeArgs, type RunOptions } from "./claude.ts";
import {
  addsText,
  type ClaudeResult,
  readEvent,
  replySoFar,
  resultOf,
} from "./events.ts";

export const IDLE_MS = 15 * 60_000;
const TIME_LIMIT_MS = 15 * 60_000;
// How long to wait before each new try when Claude Code is not there.
const MISSING_WAITS_MS = [2000, 5000, 10_000];

// The part of a child process used here, so checks can pretend.
export type Child = {
  stdin: Writable;
  stdout: Readable;
  stderr: Readable | null;
  kill(): boolean;
  on(event: "close", listener: (code: number | null) => void): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
};
export type Start = (executable: string, args: string[], cwd: string) => Child;

const startClaude: Start = (executable, args, cwd) =>
  spawn(executable, args, { cwd, windowsHide: true });

type Turn = {
  options: RunOptions;
  writing: string;
  resolve(result: ClaudeResult): void;
  timer: NodeJS.Timeout;
};

type Open = {
  child: Child;
  // What it was started with: another cwd, model or tool list needs a new one.
  key: string;
  turn: Turn | null;
  idle: NodeJS.Timeout | null;
  errors: string;
  closed: boolean;
  // Claude Code could not start: the program was not there.
  missing: boolean;
};

export class WarmClaude {
  private executable: string;
  private start: Start;
  private idleMs: number;
  private waits: number[];
  private wait: (ms: number) => Promise<void>;
  private open = new Map<string, Open>();

  constructor(
    executable: string,
    options: {
      start?: Start;
      idleMs?: number;
      waits?: number[];
      wait?: (ms: number) => Promise<void>;
    } = {},
  ) {
    this.executable = executable;
    this.start = options.start ?? startClaude;
    this.idleMs = options.idleMs ?? IDLE_MS;
    this.waits = options.waits ?? MISSING_WAITS_MS;
    this.wait =
      options.wait ?? ((ms) => new Promise((done) => setTimeout(done, ms)));
  }

  async run(options: RunOptions): Promise<ClaudeResult> {
    const id = options.session?.id;
    if (!id) throw new Error("A warm conversation needs a session id.");
    const key = JSON.stringify([
      options.cwd,
      options.model,
      options.tools,
      options.readOnly,
      options.mcp,
    ]);
    for (let tried = 0; ; tried++) {
      const open = this.opened(id, key, options);
      const result = await this.ask(id, open, options);
      const waitMs = this.waits[tried];
      if (!open.missing || waitMs === undefined || options.stop?.aborted)
        return result;
      options.onActivity("Claude Code is not there just now, waiting for it");
      await this.wait(waitMs);
    }
  }

  // Closes every open conversation (the factory is stopping).
  stop(): void {
    for (const id of [...this.open.keys()]) this.close(id);
  }

  // The conversation's open process, or a new one when it stopped, was
  // started otherwise, or is busy.
  private opened(id: string, key: string, options: RunOptions): Open {
    const open = this.open.get(id);
    if (open && !open.closed && open.key === key && !open.turn) return open;
    if (open) this.close(id);
    return this.begin(id, key, options);
  }

  private begin(id: string, key: string, options: RunOptions): Open {
    const child = this.start(
      this.executable,
      claudeArgs({ ...options, onText: options.onText ?? (() => {}) }, true),
      options.cwd,
    );
    const open: Open = {
      child,
      key,
      turn: null,
      idle: null,
      errors: "",
      closed: false,
      missing: false,
    };
    this.open.set(id, open);
    createInterface({ input: child.stdout }).on("line", (line) => {
      this.heard(open, line);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      open.errors += chunk.toString();
    });
    const ended = (why: string) => {
      open.closed = true;
      if (open.idle) clearTimeout(open.idle);
      if (this.open.get(id) === open) this.open.delete(id);
      this.finish(open, {
        ok: false,
        text: "",
        error: open.errors.trim() || why,
      });
    };
    child.on("close", (code) => {
      ended(`Claude stopped (exit code ${code}).`);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") open.missing = true;
      ended(error.message);
    });
    return open;
  }

  private ask(
    id: string,
    open: Open,
    options: RunOptions,
  ): Promise<ClaudeResult> {
    if (open.idle) clearTimeout(open.idle);
    open.idle = null;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        options.onActivity("Time limit reached, stopping Claude");
        this.close(id);
      }, options.timeLimitMs ?? TIME_LIMIT_MS);
      if (options.stop?.aborted) {
        clearTimeout(timer);
        resolve({ ok: false, text: "", error: "Stopped." });
        return;
      }
      options.stop?.addEventListener("abort", () => {
        this.close(id);
      });
      open.turn = { options, writing: "", resolve, timer };
      open.child.stdin.write(
        `${JSON.stringify({
          type: "user",
          message: { role: "user", content: options.prompt },
        })}\n`,
      );
    }).then((result) => {
      const done = result as ClaudeResult;
      // A failed turn (for example a lost conversation) starts afresh next time.
      if (!done.ok) this.close(id);
      else if (this.open.get(id) === open && !open.closed)
        open.idle = setTimeout(() => {
          this.close(id);
        }, this.idleMs);
      return done;
    });
  }

  private heard(open: Open, line: string): void {
    const turn = open.turn;
    if (!turn) return;
    const event = readEvent(line);
    if (!event) return;
    if (event.type === "stream_event") {
      turn.writing = replySoFar(event, turn.writing);
      if (addsText(event)) turn.options.onText?.(turn.writing);
      return;
    }
    for (const text of describeEvent(event, turn.options.cwd))
      turn.options.onActivity(text);
    if (event.type === "result") this.finish(open, resultOf(event));
  }

  private finish(open: Open, result: ClaudeResult): void {
    const turn = open.turn;
    if (!turn) return;
    open.turn = null;
    clearTimeout(turn.timer);
    turn.resolve(result);
  }

  private close(id: string): void {
    const open = this.open.get(id);
    if (!open) return;
    this.open.delete(id);
    open.closed = true;
    if (open.idle) clearTimeout(open.idle);
    open.child.stdin.end();
    open.child.kill();
    this.finish(open, {
      ok: false,
      text: "",
      error: "The conversation was closed.",
    });
  }
}
