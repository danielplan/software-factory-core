// The usage log, for a study of how the factory is used: every change to an
// exploration is written as one line of JSON to usage.jsonl in the log's
// folder (what the team and the kobold said, each board, the status, each
// prototype with its change), on this computer only. Only added to, never
// rewritten; the folder can be copied as it is. It must never stop anyone's
// work, so nothing it does can fail a request.

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join } from "node:path";

import type { Board, Conversation, Exploration } from "@software-factory/core";

export type UsageEvent = { event: string } & Record<string, unknown>;

export class UsageLog {
  readonly folder: string;
  private readonly computer = hostname();
  private readonly now: () => Date;

  constructor(folder: string, now: () => Date = () => new Date()) {
    this.folder = folder;
    this.now = now;
  }

  write(exploration: string, events: UsageEvent[]): void {
    if (events.length === 0) return;
    const at = this.now().toISOString();
    const lines = events.map((event) =>
      JSON.stringify({ at, ...event, exploration, computer: this.computer }),
    );
    attempt(() => {
      mkdirSync(this.folder, { recursive: true });
      appendFileSync(join(this.folder, "usage.jsonl"), `${lines.join("\n")}\n`);
    });
  }

  // A file kept with an exploration's prototypes (a patch, a picture).
  keep(exploration: string, name: string, data: string | Uint8Array): void {
    attempt(() => {
      const folder = join(this.folder, "prototypes", exploration);
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, name), data);
    });
  }
}

function attempt(work: () => void): void {
  try {
    work();
  } catch {
    // The log must never stop anyone's work.
  }
}

// What changed in an exploration's record. Pure, so the rules have tests.
export function explorationEvents(
  before: Exploration | null,
  after: Exploration,
): UsageEvent[] {
  if (!before)
    return [{ event: "created", title: after.title, problem: after.problem }];
  const events: UsageEvent[] = [];
  if (before.title !== after.title)
    events.push({ event: "renamed", from: before.title, to: after.title });
  if (before.problem !== after.problem)
    events.push({ event: "problem", problem: after.problem });
  if (before.status !== after.status)
    events.push({ event: "status", from: before.status, to: after.status });
  if (before.work !== after.work && after.work !== null)
    events.push({ event: "handed-off", card: after.work });
  return events;
}

// What was said since the conversation was last saved.
export function conversationEvents(
  before: Conversation,
  after: Conversation,
): UsageEvent[] {
  return after.messages.slice(before.messages.length).map((said) => ({
    event: `${said.from}-said`,
    text: said.text,
  }));
}

type Prototype = Extract<Board["things"][number], { kind: "prototype" }>;

// A board that changed, as it is now; and each prototype asked for, made
// (the kobold's last words came) or agreed.
export function boardEvents(before: Board, after: Board): UsageEvent[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  const events: UsageEvent[] = [{ event: "board", board: after }];
  const old = new Map(prototypesOf(before).map((one) => [one.key, one]));
  for (const made of prototypesOf(after)) {
    const was = old.get(made.key);
    if (!was)
      events.push({ event: "prototype-asked", key: made.key, name: made.name });
    if (made.said && made.said !== was?.said)
      events.push({
        event: "prototype-made",
        key: made.key,
        branch: made.branch,
        said: made.said,
      });
    if (made.agreed && !was?.agreed)
      events.push({ event: "prototype-agreed", key: made.key });
  }
  return events;
}

export function prototypesOf(board: Board): Prototype[] {
  return board.things.filter(
    (thing): thing is Prototype => thing.kind === "prototype",
  );
}
