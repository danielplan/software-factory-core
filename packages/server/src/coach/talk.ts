// A conversation with Claude Code about a map, as the setup coach and the
// idea coach hold it: what was said, the reply while it is written, what
// the coach is doing, why it could not answer, and the map it draws with
// its tools (setup-tools.ts) and the owner moves or takes cards off. One
// turn at a time.

import { randomUUID } from "node:crypto";

import type { Claude, RunOptions } from "@software-factory/core";

import type { ChangeDraft, CoachMessage, Draft } from "../api.ts";
import { Refused } from "../refused.ts";
import { draw, type Drawing, EMPTY, mapText, move, removeCard } from "./map.ts";
import { COACH_HEADER } from "./setup-tools.ts";

// The coach's own tools, in plain words for the owner.
const TOOL_LINES: Record<string, string> = {
  draw: "Drawing on the map",
  configure: "Setting up the factory",
};
const TOOL_PREFIX = "Using mcp__setup__";
// What the owner sees while the coach works: its tools, not its words
// (those are in the reply being written).
const SHOWN = /^(Reading|Searching|Looking)/;

// What a turn may do: its tools, what it may not touch, its instructions.
export type TurnRights = Pick<
  RunOptions,
  "readOnly" | "tools" | "deny" | "instructions"
>;

export class Talk {
  readonly token = randomUUID();
  messages: CoachMessage[];
  map: Draft;
  writing: string | null = null;
  activity: string | null = null;
  problem: string | null = null;
  private conversation: string;
  private started: boolean;
  private ownerChanged = false;
  private toolsUrl = "";
  private claude: Claude;
  private cwd: string;
  private changed: () => void;

  constructor(options: {
    claude: Claude;
    cwd: string;
    onChange: () => void;
    // A conversation to go on with, kept from before.
    kept?: { conversation: string; messages: CoachMessage[]; map: Draft };
  }) {
    this.claude = options.claude;
    this.cwd = options.cwd;
    this.changed = options.onChange;
    this.conversation = options.kept?.conversation ?? randomUUID();
    // Going on with a conversation once the coach has answered in it.
    this.started =
      options.kept?.messages.some((m) => m.from === "coach") ?? false;
    this.messages = options.kept?.messages ?? [];
    this.map = options.kept?.map ?? EMPTY;
  }

  get working(): boolean {
    return this.writing !== null;
  }

  get id(): string {
    return this.conversation;
  }

  // Where the server answers the coach's tools, once it listens.
  serveToolsAt(url: string): void {
    this.toolsUrl = url;
  }

  // The coach's drawing on the map; what it did, and the map now.
  draw(drawing: Drawing, picture: (path: string) => string): string {
    const drawn = draw(this.map, drawing, picture);
    this.map = drawn.draft;
    this.changed();
    const done = drawn.said.length > 0 ? [...drawn.said, ""] : [];
    return [...done, mapText(this.map)].join("\n");
  }

  // The owner moved or took off a card: the coach hears of it with the next
  // message.
  ownerChange(change: ChangeDraft): void {
    this.map =
      "move" in change
        ? move(this.map, change.move)
        : removeCard(this.map, change.remove);
    this.ownerChanged = true;
    this.changed();
  }

  // The owner's words, shown as said; refused while the coach answers.
  heard(text: string): string {
    if (!text.trim()) throw new Refused("Say something first.");
    if (this.working) throw new Refused("The coach is still answering.");
    this.messages = [...this.messages, { from: "owner", text: text.trim() }];
    return text.trim();
  }

  // One turn: the prompt, with what the owner changed and the language they
  // spoke in, and what the turn may do. True when the coach answered.
  async answer(
    text: string,
    spokenIn: string | undefined,
    rights: TurnRights,
  ): Promise<boolean> {
    this.writing = "";
    this.activity = null;
    this.problem = null;
    this.changed();
    const result = await this.claude.run(this.turn(text, spokenIn, rights));
    this.started = this.started || result.ok;
    // A first turn that failed starts a fresh conversation next time.
    if (!this.started) this.conversation = randomUUID();
    if (result.ok && result.text.trim())
      this.messages = [
        ...this.messages,
        { from: "coach", text: result.text.trim() },
      ];
    if (!result.ok) this.problem = problemOf(result.error ?? "");
    this.writing = null;
    this.activity = null;
    this.changed();
    return result.ok;
  }

  private turn(
    text: string,
    spokenIn: string | undefined,
    rights: TurnRights,
  ): RunOptions {
    const notes = [
      ...(this.ownerChanged
        ? ["I changed the canvas myself; look at it."]
        : []),
      ...(spokenIn
        ? [
            `Said out loud, in ${spokenIn}: answer in ${spokenIn}, for being read aloud.`,
          ]
        : []),
    ];
    const prompt = notes.length > 0 ? `${text}\n\n(${notes.join(" ")})` : text;
    this.ownerChanged = false;
    return {
      cwd: this.cwd,
      prompt,
      ...rights,
      session: { id: this.conversation, resume: this.started },
      mcp: {
        name: "setup",
        url: this.toolsUrl,
        headers: { [COACH_HEADER]: this.token },
      },
      onText: (reply: string) => {
        this.writing = reply;
        this.changed();
      },
      onActivity: (line: string) => {
        const shown = plain(line);
        if (!shown) return;
        this.activity = shown;
        this.changed();
      },
    };
  }
}

// A line of what Claude Code does, as the owner sees it; null to skip.
function plain(line: string): string | null {
  if (line.startsWith(TOOL_PREFIX))
    return TOOL_LINES[line.slice(TOOL_PREFIX.length)] ?? null;
  return SHOWN.test(line) ? line : null;
}

function problemOf(error: string): string {
  if (/ENOENT/.test(error))
    return "Claude Code is not on this computer. Install it from claude.com/code and sign in, then try again.";
  if (/log ?in|auth|credential/i.test(error))
    return "Claude Code is not signed in. Run claude once in a terminal to sign in, then try again.";
  return `The coach stopped: ${error || "no reason given"}. Try again.`;
}
