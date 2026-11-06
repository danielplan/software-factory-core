// The setup coach: a conversation with the owner, held by Claude Code on
// this computer in the project's folder. It plans the factory with the owner
// on a map (map.ts) and, once they say so, builds it: its own tools
// (setup-tools.ts) draw the map and set the factory's settings, and Claude
// Code's own read the code and, when building, write the factory's pages.
// When the project has code, it reads it first, before the owner says
// anything. One turn at a time; the owner sees the reply while it is
// written and what the coach is doing.

import { readdirSync } from "node:fs";

import type { Claude, Kit } from "@software-factory/core";

import type { ChangeDraft, CoachView, Draft } from "../api.ts";
import type { Installable } from "../installables.ts";
import { Refused } from "../refused.ts";
import type { Drawing } from "./map.ts";
import { type TrackerSetup, trackerFacts } from "../connect/tracker-setup.ts";
import { projectFacts } from "./project-facts.ts";
import { readSetup, saveSetup } from "./setup-record.ts";
import { Talk } from "./talk.ts";

const HELLO =
  "Hi! Tell me what you want to build: what is the idea, who is it for, and what should it change for them?";

const PLAN = {
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  deny: ["Read(**/.env*)"],
};
const BUILD = {
  readOnly: false,
  tools: ["Read", "Grep", "Glob", "Write", "Edit"],
  deny: ["Read(**/.env*)", "Edit(**/.env*)", "Write(**/.env*)"],
};

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
  // What the trackers that come with the factory can set up with the owner
  // (where the code is, the boards there; connecting or making one).
  trackers?: TrackerSetup[];
};

// What a session gives the coaches: Claude Code, both coaches' instructions,
// and the trackers the setup coach can set up a board with.
export type CoachOptions = Pick<
  SetupCoachOptions,
  "claude" | "guide" | "trackers"
> & { ideaGuide: string };

export class SetupCoach {
  readonly kits: Kit[];
  readonly installables: Installable[];
  private talk: Talk;
  // Planning, or building once the owner said so; finished once they opened
  // the factory.
  private phase: "plan" | "build" = "plan";
  private finished = false;
  // Whether a turn was asked for: the page then shows the canvas.
  private asked = false;
  // The project's code, read before anything else; until a turn has
  // worked, it goes with the next one.
  private opening: string | null;
  private options: SetupCoachOptions;

  constructor(options: SetupCoachOptions) {
    this.options = options;
    this.kits = options.kits;
    this.installables = options.installables;
    // An earlier setup in this project goes on where it was.
    const kept = readSetup(options.project);
    this.talk = new Talk({
      claude: options.claude,
      cwd: options.project,
      onChange: () => {
        options.onChange();
        // Kept once a turn is over, not while the reply is written.
        if (!this.talk.working) this.keep();
      },
      ...(kept ? { kept: { ...kept, map: kept.map as Draft } } : {}),
    });
    this.phase = kept?.phase ?? "plan";
    this.asked = (kept?.messages.length ?? 0) > 0;
    const answered = kept?.messages.some((m) => m.from === "coach") ?? false;
    this.opening =
      hasCode(options.project) && !answered
        ? `Here's my project: ${options.project}\n\n${projectFacts(options.project)}`
        : null;
    if (!this.opening && !kept)
      this.talk.messages = [{ from: "coach", text: HELLO }];
  }

  // The conversation kept in the project, once something was said or drawn.
  private keep(): void {
    const { talk } = this;
    if (
      !talk.messages.some((m) => m.from === "owner") &&
      !talk.map.cards.length
    )
      return;
    saveSetup(this.options.project, {
      conversation: talk.id,
      phase: this.phase,
      messages: talk.messages,
      map: talk.map,
    });
  }

  get token(): string {
    return this.talk.token;
  }

  get map(): Draft {
    return this.talk.map;
  }

  // Where the server answers the coach's tools, once it listens.
  serveToolsAt(url: string): void {
    this.talk.serveToolsAt(url);
  }

  view(): CoachView {
    const { talk } = this;
    return {
      messages: talk.messages,
      writing: talk.writing,
      activity: talk.activity,
      working: talk.working,
      started: this.asked,
      problem: talk.problem,
      draft: talk.map,
      phase: this.phase,
      made: this.options.made(),
    };
  }

  // Building and not yet opened: setup stays on the page.
  building(): boolean {
    return this.phase === "build" && !this.finished;
  }

  draw(drawing: Drawing, picture: (path: string) => string): string {
    return this.talk.draw(drawing, picture);
  }

  ownerChange(change: ChangeDraft): void {
    this.talk.ownerChange(change);
  }

  // The owner says to build the factory as planned: from now on the coach
  // may write in the project.
  async build(): Promise<void> {
    if (this.talk.working) throw new Refused("The coach is still answering.");
    this.phase = "build";
    this.talk.heard("Build the factory.");
    await this.answer(
      "Build the factory now, as we planned: you may write in the project.",
      undefined,
    );
  }

  // The owner opened the factory: setup is over.
  finish(): void {
    this.finished = true;
    this.options.onChange();
  }

  // The owner's words; `spokenIn` names the language when they were said
  // out loud, so the answer is in it and is read aloud.
  async say(text: string, spokenIn?: string): Promise<void> {
    const said = this.talk.heard(text);
    await this.answer(said, spokenIn?.trim().slice(0, 40));
  }

  // The project's code read and drawn before the owner says anything.
  async begin(): Promise<void> {
    if (!this.opening || this.asked) return;
    const tracked = await trackerFacts(
      this.options.trackers ?? [],
      this.options.project,
    );
    if (tracked && this.opening) this.opening += `\n\n${tracked}`;
    await this.answer("", undefined);
  }

  private async answer(text: string, spokenIn: string | undefined) {
    this.asked = true;
    const said = [this.opening, text].filter(Boolean).join("\n\n");
    const rights = this.phase === "build" ? BUILD : PLAN;
    const ok = await this.talk.answer(said, spokenIn, {
      ...rights,
      instructions: this.instructions(),
    });
    if (ok) this.opening = null;
  }

  private instructions(): string {
    const kinds = this.kits
      .map(
        (kit) =>
          `- \`${kit.kind}\`: ${kit.name}. ${kit.about}${kit.create ? "" : " (Existing code only.)"}`,
      )
      .join("\n");
    const first = this.opening
      ? `The owner started the factory in their project's folder, ${this.options.project}: the first message says so, with the project's history and its own documentation.`
      : `The project's folder, ${this.options.project}, has no code yet. The owner's first message answers: "${HELLO}"`;
    const installable = this.installables
      .map(
        (i) =>
          `- \`${i.id}\` (${i.kind}): ${i.name}. ${i.about}${i.present() ? " Here already." : ""}`,
      )
      .join("\n");
    return `${this.options.guide}\n\n## The kinds the kits know\n\n${kinds}\n\n## What configure can install or switch on\n\n${installable}\n\n${first}`;
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
