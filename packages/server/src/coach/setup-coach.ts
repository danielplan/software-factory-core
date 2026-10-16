// The setup coach: a conversation with the owner, held by Claude Code on
// this computer in the project's folder. It plans the factory with the owner
// on a map (map.ts) and, once they say so, builds it: its own tools
// (setup-tools.ts) draw the map and set the factory's settings, and Claude
// Code's own read the code and, when building, write the factory's pages.
// When the project has code, it reads it first, before the owner says
// anything. One turn at a time; the owner sees the reply while it is
// written and what the coach is doing.

import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";

import type { Claude, Kit } from "@software-factory/core";

import type { ChangeDraft, CoachMessage, CoachView, Draft } from "../api.ts";
import type { Installable } from "../installables.ts";
import { Refused } from "../refused.ts";
import { draw, type Drawing, EMPTY, mapText, move, removeCard } from "./map.ts";
import { COACH_HEADER } from "./setup-tools.ts";

const HELLO =
  "Hi! Tell me what you want to build: what is the idea, who is it for, and what should it change for them?";

// The coach's own tools, in plain words for the owner.
const TOOL_LINES: Record<string, string> = {
  draw: "Drawing on the map",
  configure: "Setting up the factory",
};
const TOOL_PREFIX = "Using mcp__setup__";
// What the owner sees while the coach works: its tools, not its words
// (those are in the reply being written).
const SHOWN = /^(Reading|Searching|Looking)/;

export type SetupCoachOptions = {
  claude: Claude;
  kits: Kit[];
  // What the coach may install once the owner agreed (installables.ts).
  installables: Installable[];
  // Whether the factory it builds is there yet.
  made: () => boolean;
  // The coach's instructions (the method's guides/setup-coach.md).
  guide: string;
  onChange: () => void;
  // The project being set up, where Claude Code starts; it reads the code
  // below.
  project: string;
};

export class SetupCoach {
  readonly token = randomUUID();
  readonly kits: Kit[];
  readonly installables: Installable[];
  // The map it plans with the owner.
  map: Draft = EMPTY;
  // Planning, or building once the owner said so; finished once they opened
  // the factory.
  private phase: "plan" | "build" = "plan";
  private finished = false;
  private options: SetupCoachOptions;
  private conversation = randomUUID();
  private started = false;
  // Whether a turn was asked for: the page then shows the canvas.
  private asked = false;
  // The project's code, read before anything else; until a turn has
  // worked, it goes with the next one.
  private opening: string | null;
  private messages: CoachMessage[];
  private writing: string | null = null;
  private activity: string | null = null;
  private problem: string | null = null;
  private ownerChanged = false;
  private toolsUrl = "";

  constructor(options: SetupCoachOptions) {
    this.options = options;
    this.kits = options.kits;
    this.installables = options.installables;
    this.opening = hasCode(options.project)
      ? `Here's my project: ${options.project}`
      : null;
    this.messages = this.opening ? [] : [{ from: "coach", text: HELLO }];
  }

  // Where the server answers the coach's tools, once it listens.
  serveToolsAt(url: string): void {
    this.toolsUrl = url;
  }

  view(): CoachView {
    return {
      messages: this.messages,
      writing: this.writing,
      activity: this.activity,
      working: this.writing !== null,
      started: this.asked,
      problem: this.problem,
      draft: this.map,
      phase: this.phase,
      made: this.options.made(),
    };
  }

  // Building and not yet opened: setup stays on the page.
  building(): boolean {
    return this.phase === "build" && !this.finished;
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

  // The owner says to build the factory as planned: from now on the coach
  // may write in the project.
  async build(): Promise<void> {
    if (this.writing !== null)
      throw new Refused("The coach is still answering.");
    this.phase = "build";
    this.messages = [
      ...this.messages,
      { from: "owner", text: "Build the factory." },
    ];
    await this.answer(
      "Build the factory now, as we planned: you may write in the project.",
      undefined,
    );
  }

  // The owner opened the factory: setup is over.
  finish(): void {
    this.finished = true;
    this.changed();
  }

  // The owner's words; `spokenIn` names the language when they were said
  // out loud, so the answer is in it and is read aloud.
  async say(text: string, spokenIn?: string): Promise<void> {
    if (!text.trim()) throw new Refused("Say something first.");
    if (this.writing !== null)
      throw new Refused("The coach is still answering.");
    this.messages = [...this.messages, { from: "owner", text: text.trim() }];
    await this.answer(text.trim(), spokenIn?.trim().slice(0, 40));
  }

  // The project's code read and drawn before the owner says anything.
  async begin(): Promise<void> {
    if (!this.opening || this.asked) return;
    await this.answer("", undefined);
  }

  private async answer(text: string, spokenIn: string | undefined) {
    this.asked = true;
    this.writing = "";
    this.activity = null;
    this.problem = null;
    this.changed();
    const result = await this.options.claude.run(this.turn(text, spokenIn));
    this.started = this.started || result.ok;
    if (result.ok) this.opening = null;
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
  }

  private turn(text: string, spokenIn: string | undefined) {
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
    const said = [this.opening, text].filter(Boolean).join("\n\n");
    const prompt = notes.length > 0 ? `${said}\n\n(${notes.join(" ")})` : said;
    this.ownerChanged = false;
    return {
      cwd: this.options.project,
      prompt,
      ...(this.phase === "build"
        ? {
            readOnly: false,
            tools: ["Read", "Grep", "Glob", "Write", "Edit"],
            deny: ["Read(**/.env*)", "Edit(**/.env*)", "Write(**/.env*)"],
          }
        : {
            readOnly: true,
            tools: ["Read", "Grep", "Glob"],
            deny: ["Read(**/.env*)"],
          }),
      instructions: this.instructions(),
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

  private instructions(): string {
    const kinds = this.kits
      .map(
        (kit) =>
          `- \`${kit.kind}\`: ${kit.name}. ${kit.about}${kit.create ? "" : " (Existing code only.)"}`,
      )
      .join("\n");
    const first = this.opening
      ? `The owner started the factory in their project's folder, ${this.options.project}: the first message says so.`
      : `The project's folder, ${this.options.project}, has no code yet. The owner's first message answers: "${HELLO}"`;
    const installable = this.installables
      .map(
        (i) =>
          `- \`${i.id}\` (${i.kind}): ${i.name}. ${i.about}${i.present() ? " Here already." : ""}`,
      )
      .join("\n");
    return `${this.options.guide}\n\n## The kinds the kits know\n\n${kinds}\n\n## What configure can install or switch on\n\n${installable}\n\n${first}`;
  }

  private changed(): void {
    this.options.onChange();
  }
}

// Whether a folder has anything in it but hidden files (such as .git).
function hasCode(folder: string): boolean {
  try {
    return readdirSync(folder).some((name) => !name.startsWith("."));
  } catch {
    return false;
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
