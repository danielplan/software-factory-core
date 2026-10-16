// The setup coach: a conversation with the owner, held by Claude Code on
// this computer in the project's folder, that drafts the factory on a
// canvas (draft-keeper.ts) with its tools (setup-tools.ts). When the project
// has code, it reads it first, before the owner says anything; it changes
// nothing;
// what it proposes to install waits for the owner's approval. One
// turn at a time; the owner sees the reply while it is written and what the
// coach is doing.

import { randomUUID } from "node:crypto";
import { readdirSync } from "node:fs";

import type { Claude, Kit } from "@software-factory/core";

import type { CoachMessage, CoachView } from "../api.ts";
import type { Installable } from "../installables.ts";
import { Refused } from "../refused.ts";
import { DraftKeeper } from "./draft-keeper.ts";
import { COACH_HEADER } from "./setup-tools.ts";

const HELLO =
  "Hi! Tell me what you want to build: what is the idea, who is it for, and what should it change for them?";

// The coach's own tools, in plain words for the owner.
const TOOL_LINES: Record<string, string> = {
  set_company: "Writing down what the project is",
  look_for_products: "Looking for products in your code",
  look_at_history: "Reading the project's history",
  add_product: "Noting a product",
  change_product: "Changing a product",
  remove: "Taking something off the canvas",
  write_blueprint: "Writing a blueprint",
  draw: "Drawing what I learnt",
  focus: "Showing you",
  disconnect: "Taking an arrow off",
  look_at_canvas: "Looking at the canvas",
  settle: "Marking what we agreed",
  look_at_computer: "Checking what is on this computer",
  propose_install: "Proposing something to install",
};
const TOOL_PREFIX = "Using mcp__setup__";
// What the owner sees while the coach works: its tools, not its words
// (those are in the reply being written).
const SHOWN = /^(Reading|Searching|Looking)/;

export type SetupCoachOptions = {
  claude: Claude;
  kits: Kit[];
  // What the coach may propose to install (installables.ts).
  installables: Installable[];
  // The coach's instructions (the method's guides/setup-coach.md).
  guide: string;
  onChange: () => void;
  // The project being set up, where Claude Code starts; it reads the code
  // below.
  project: string;
};

export class SetupCoach {
  readonly token = randomUUID();
  readonly keeper: DraftKeeper;
  readonly kits: Kit[];
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
    this.keeper = new DraftKeeper(
      options.kits,
      options.installables,
      options.onChange,
      options.project,
    );
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
      draft: this.keeper.draft,
    };
  }

  // The owner changed the canvas: the coach hears of it with the next message.
  ownerChange(act: () => void): void {
    act();
    this.ownerChanged = true;
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
      readOnly: true,
      tools: ["Read", "Grep", "Glob"],
      deny: ["Read(**/.env*)"],
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
    return `${this.options.guide}\n\n## The kinds the kits know\n\n${kinds}\n\n${first}`;
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
    return "Claude Code is not on this computer. Install it from claude.com/code and sign in, or fill in the form instead.";
  if (/log ?in|auth|credential/i.test(error))
    return "Claude Code is not signed in. Run claude once in a terminal to sign in, then try again.";
  return `The coach stopped: ${error || "no reason given"}. Try again, or fill in the form instead.`;
}
