// The setup coach: a conversation with the owner, held by Claude Code on
// this computer, that drafts the company on a map (draft-keeper.ts) with its
// tools (setup-tools.ts). It reads existing code but changes nothing. One
// turn at a time; the owner sees the reply while it is written and what the
// coach is doing.

import { randomUUID } from "node:crypto";
import { homedir } from "node:os";

import type { Claude, Kit } from "@software-factory/core";

import type { CoachMessage, CoachView } from "../api.ts";
import { Refused } from "../refused.ts";
import { DraftKeeper } from "./draft-keeper.ts";
import { COACH_HEADER } from "./setup-tools.ts";

const HELLO =
  "Hi! I'll help you set up your factory. What's your company called, and what does it do?";

// The coach's own tools, in plain words for the owner.
const TOOL_LINES: Record<string, string> = {
  set_company: "Putting the company on the map",
  look_for_products: "Looking for products in your code",
  add_product: "Adding a product to the map",
  change_product: "Changing a product on the map",
  remove_product: "Taking a product off the map",
  write_blueprint: "Writing a blueprint",
  look_at_map: "Looking at the map",
};
const TOOL_PREFIX = "Using mcp__setup__";
// What the owner sees while the coach works: its tools, not its words
// (those are in the reply being written).
const SHOWN = /^(Reading|Searching|Looking)/;

export type SetupCoachOptions = {
  claude: Claude;
  kits: Kit[];
  // The coach's instructions (the method's guides/setup-coach.md).
  guide: string;
  onChange: () => void;
  // Where Claude Code starts; it reads code anywhere below.
  home?: string;
};

export class SetupCoach {
  readonly token = randomUUID();
  readonly keeper: DraftKeeper;
  readonly kits: Kit[];
  private options: SetupCoachOptions;
  private conversation = randomUUID();
  private started = false;
  private messages: CoachMessage[] = [{ from: "coach", text: HELLO }];
  private writing: string | null = null;
  private activity: string | null = null;
  private problem: string | null = null;
  private ownerChanged = false;
  private toolsUrl = "";

  constructor(options: SetupCoachOptions) {
    this.options = options;
    this.kits = options.kits;
    this.keeper = new DraftKeeper(options.kits, options.onChange);
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
      problem: this.problem,
      draft: this.keeper.draft,
    };
  }

  // The owner changed the map: the coach hears of it with the next message.
  ownerChange(act: () => void): void {
    act();
    this.ownerChanged = true;
  }

  async say(text: string): Promise<void> {
    if (!text.trim()) throw new Refused("Say something first.");
    if (this.writing !== null)
      throw new Refused("The coach is still answering.");
    this.messages = [...this.messages, { from: "owner", text: text.trim() }];
    this.writing = "";
    this.activity = null;
    this.problem = null;
    this.changed();
    const result = await this.options.claude.run(this.turn(text.trim()));
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
  }

  private turn(text: string) {
    const prompt = this.ownerChanged
      ? `${text}\n\n(I changed the map myself; look at it.)`
      : text;
    this.ownerChanged = false;
    return {
      cwd: this.options.home ?? homedir(),
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
    return `${this.options.guide}\n\n## The kinds the kits know\n\n${kinds}\n\nThe owner's first message answers: "${HELLO}"`;
  }

  private changed(): void {
    this.options.onChange();
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
