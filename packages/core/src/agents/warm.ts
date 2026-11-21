// Claude Code kept open between the turns of a conversation, for a coach's
// chat: starting Claude Code costs about 5 seconds, so a fresh
// start on every turn makes the owner wait. Used like Claude.run: each
// conversation (session id) keeps its own Claude Code process, which takes the
// turns over standard input (stream-json) one at a time and closes after a
// while without turns. A process that stopped is started again on the next
// turn and continues the same conversation.

import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import { describeEvent } from "./activity.ts";
import { claudeArgs, type RunOptions } from "./claude.ts";
import {
  addsText,
  type ClaudeEvent,
  type ClaudeResult,
  readEvent,
  replySoFar,
  resultOf,
} from "./events.ts";

export const IDLE_MS = 15 * 60_000;
const TIME_LIMIT_MS = 15 * 60_000;
// After an answer, how long a turn told something in the middle waits for
// Claude Code to start answering it (it does at once, with a new "init").
export const FOLLOW_MS = 2_000;

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
  // Told something since Claude Code last started answering: an answer
  // with only words cannot take it in, so Claude Code answers it after, in
  // a turn of its own, and both answers make this turn's.
  told: boolean;
  answered: string[];
  follow: NodeJS.Timeout | null;
};

type Open = {
  child: Child;
  // What it was started with: another cwd, model or tool list needs a new one.
  key: string;
  turn: Turn | null;
  idle: NodeJS.Timeout | null;
  errors: string;
  closed: boolean;
};

export class WarmClaude {
  private executable: string;
  private start: Start;
  private idleMs: number;
  private followMs: number;
  private open = new Map<string, Open>();

  constructor(
    executable: string,
    options: { start?: Start; idleMs?: number; followMs?: number } = {},
  ) {
    this.executable = executable;
    this.start = options.start ?? startClaude;
    this.idleMs = options.idleMs ?? IDLE_MS;
    this.followMs = options.followMs ?? FOLLOW_MS;
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
    let open = this.open.get(id);
    if (open && (open.closed || open.key !== key || open.turn)) {
      this.close(id);
      open = undefined;
    }
    open ??= this.begin(id, key, options);
    return await this.ask(id, open, options);
  }

  // A message for a conversation in the middle of a turn: Claude Code takes
  // it in at its next step and answers both in the one result.
  tell(session: string, message: string): boolean {
    const open = this.open.get(session);
    if (!open || open.closed || !open.turn) return false;
    open.turn.told = true;
    open.child.stdin.write(userLine(message));
    return true;
  }

  // Stops a conversation's turn: its Claude Code is closed, the turn ends
  // without an answer, and the next turn starts it again on the same
  // conversation (what was said so far is kept by Claude Code).
  interrupt(session: string): boolean {
    const open = this.open.get(session);
    if (!open || open.closed || !open.turn) return false;
    this.close(session);
    return true;
  }

  // Closes every open conversation (the factory is stopping).
  stop(): void {
    for (const id of [...this.open.keys()]) this.close(id);
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
    child.on("error", (error) => {
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
      open.turn = {
        options,
        writing: "",
        resolve,
        timer,
        told: false,
        answered: [],
        follow: null,
      };
      open.child.stdin.write(userLine(options.prompt));
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
    if (isStart(event)) {
      // Claude Code starts answering what was told: the turn goes on.
      if (turn.follow) clearTimeout(turn.follow);
      turn.follow = null;
      turn.told = false;
    }
    if (event.type === "stream_event") {
      turn.writing = replySoFar(event, turn.writing);
      // The answers so far stay shown while the next one is written.
      if (addsText(event))
        turn.options.onText?.([...turn.answered, turn.writing].join("\n\n"));
      return;
    }
    for (const text of describeEvent(event, turn.options.cwd))
      turn.options.onActivity(text);
    if (event.type === "result") this.answered(open, turn, resultOf(event));
  }

  // An answer: the turn's, or the first of several when something was told
  // that Claude Code answers next.
  private answered(open: Open, turn: Turn, result: ClaudeResult): void {
    const all = {
      ...result,
      text: [...turn.answered, result.text].join("\n\n"),
    };
    if (!result.ok || !turn.told) {
      this.finish(open, all);
      return;
    }
    turn.answered.push(result.text);
    turn.follow = setTimeout(() => {
      this.finish(open, all);
    }, this.followMs);
  }

  private finish(open: Open, result: ClaudeResult): void {
    const turn = open.turn;
    if (!turn) return;
    open.turn = null;
    clearTimeout(turn.timer);
    if (turn.follow) clearTimeout(turn.follow);
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

// One message from the user, as Claude Code reads it over standard input.
function userLine(content: string): string {
  return `${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`;
}

// Claude Code starting to answer a message (its "init", before each turn).
function isStart(event: ClaudeEvent): boolean {
  return event.type === "system" && event.subtype === "init";
}
