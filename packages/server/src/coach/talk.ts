// A conversation with Claude Code about a map, as the setup coach and the
// idea coach hold it: what was said, the reply while it is written, what
// the coach is doing, why it could not answer, and the map it draws with
// its tools (setup-tools.ts) and the owner moves or takes cards off. One
// turn at a time.

import { randomUUID } from "node:crypto";

import type { Claude, ClaudeResult, RunOptions } from "@software-factory/core";

import type { ChangeDraft, CoachMessage, Draft } from "../api.ts";
import { Refused } from "../refused.ts";
import {
  draw,
  type Drawing,
  EMPTY,
  mapText,
  move,
  removeCard,
  writeCard,
} from "./map.ts";
import { KeptSteps, SHOWN, toolOf } from "./kept-steps.ts";
import { COACH_HEADER } from "./setup-tools.ts";

// The coach's own tools, in plain words for the owner.
const TOOL_LINES: Record<string, string> = {
  draw: "Drawing on the map",
  board: "Changing the board",
  configure: "Setting up the factory",
  list_personas: "Looking at the personas",
  add_persona: "Adding the persona",
  add_exploration: "Adding the exploration",
};

// How far a turn got, from what Claude Code reported: it starts reading what
// it was given (0), goes on to look through the code when it reports
// reading or searching (1), and draws when it uses its drawing tool (2). A
// step is reached by a report, never by time.
export type Step = 0 | 1 | 2;
// The tools that put something on the map or board: the coach's `draw`, and
// the explorer's (explorations/board-tools.ts).
const DRAWING_TOOLS = [
  "draw",
  "add_note",
  "add_diagram",
  "add_choice",
  "change_thing",
  "link",
  "make_prototype",
];
function stepOf(line: string): Step {
  if (DRAWING_TOOLS.includes(toolOf(line) ?? "")) return 2;
  return SHOWN.test(line) ? 1 : 0;
}

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
  // The step the turn is at (kept after the turn, so a stop shows where).
  step: Step = 0;
  private conversation: string;
  private started: boolean;
  // Words said while the coach answered that could not go into its turn:
  // answered right after it, with the turn's rights.
  private waiting: string[] = [];
  private stopping = false;
  private last: { spokenIn: string | undefined; rights: TurnRights } | null =
    null;
  private ownerChanged = false;
  // The owner stopped the last answer: the coach hears of it next turn.
  private wasStopped = false;
  private toolsUrl = "";
  private claude: Claude;
  private cwd: string;
  private changed: () => void;
  private who: string;
  // The steps it takes, kept in its words (only when asked for).
  private kept: KeptSteps | null = null;

  constructor(options: {
    claude: Claude;
    cwd: string;
    onChange: () => void;
    // Who stops in the words of a failed turn ("The coach" by default).
    who?: string;
    // A conversation to go on with, kept from before; `started` when it is
    // known whether Claude Code has it (otherwise: once the coach answered).
    kept?: {
      conversation: string;
      messages: CoachMessage[];
      map: Draft;
      started?: boolean;
    };
  }) {
    this.claude = options.claude;
    this.cwd = options.cwd;
    this.changed = options.onChange;
    this.who = options.who ?? "The coach";
    this.conversation = options.kept?.conversation ?? randomUUID();
    // Going on with a conversation once the coach has answered in it.
    this.started =
      options.kept?.started ??
      options.kept?.messages.some((m) => m.from === "coach") ??
      false;
    this.messages = options.kept?.messages ?? [];
    this.map = options.kept?.map ?? EMPTY;
  }

  get working(): boolean {
    return this.writing !== null;
  }

  get id(): string {
    return this.conversation;
  }

  // The coach's words keep the steps it takes between them.
  keepSteps(): void {
    this.kept = new KeptSteps();
  }

  // The next turn's words start with what started it (a step).
  opensWith(step: string): void {
    this.kept?.opensWith(step);
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
    this.map = changedMap(this.map, change);
    this.ownerChanged = true;
    this.changed();
  }

  // A line the coach says without being asked (something it finished).
  told(text: string): void {
    this.messages = [...this.messages, { from: "coach", text }];
    this.changed();
  }

  // The owner's words, shown as said. While the coach answers they steer
  // it: they go into its turn (or, when that cannot be, are answered right
  // after it), and null says there is no new turn to start. `more` is added
  // for the coach only (what they attached).
  heard(text: string, more = ""): string | null {
    const said = text.trim();
    if (!said) throw new Refused("Say something first.");
    this.messages = [...this.messages, { from: "owner", text: said }];
    if (!this.working) return said;
    const steer = `${said}${more}`;
    if (!this.claude.tell?.(this.conversation, steer)) this.waiting.push(steer);
    this.changed();
    return null;
  }

  // The owner's last words taken back, when nothing came after them (the
  // answer failed), to say them again; null when there are none.
  takeBack(): string | null {
    const last = this.messages.at(-1);
    if (this.working || last?.from !== "owner") return null;
    this.messages = this.messages.slice(0, -1);
    this.changed();
    return last.text;
  }

  // The owner pressed Stop: the turn ends, what the coach had written so far
  // stays, and nothing said meanwhile is answered. False with no turn.
  stop(): boolean {
    if (!this.working) return false;
    this.stopping = true;
    this.waiting = [];
    if (this.claude.interrupt?.(this.conversation)) return true;
    this.stopping = false;
    return false;
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
    this.step = 0;
    this.kept?.start();
    this.last = { spokenIn, rights };
    this.changed();
    const result = await this.claude.run(this.turn(text, spokenIn, rights));
    this.ended(result);
    this.answerWaiting();
    return result.ok;
  }

  // A turn over: its answer kept (or, stopped, what it wrote so far), or
  // why it failed.
  private ended(result: ClaudeResult): void {
    const stopped = this.stopping;
    this.stopping = false;
    this.wasStopped = stopped;
    const soFar = this.soFar();
    this.keepConversation(result.ok, stopped);
    const reply = (
      stopped ? soFar : (this.kept?.answer(result.text) ?? result.text)
    ).trim();
    if ((result.ok || stopped) && reply)
      this.messages = [...this.messages, { from: "coach", text: reply }];
    if (!result.ok && !stopped)
      this.problem = problemOf(result.error ?? "", this.who);
    this.writing = null;
    this.activity = null;
    this.changed();
  }

  // Whether Claude Code has the conversation to go on with: once a turn
  // answered, or was stopped after it got going (it wrote or worked); a
  // first turn that failed, or was stopped at once, starts afresh next time.
  private keepConversation(ok: boolean, stopped: boolean): void {
    const going = this.soFar() !== "" || this.activity !== null;
    this.started = this.started || ok || (stopped && going);
    if (!this.started) this.conversation = randomUUID();
  }

  // What the coach has written of its answer so far.
  private soFar(): string {
    return this.writing ?? "";
  }

  // What was said during the turn and could not join it: answered now, as
  // one message.
  private answerWaiting(): void {
    if (this.waiting.length === 0 || !this.last) return;
    const said = this.waiting.join("\n\n");
    this.waiting = [];
    void this.answer(said, this.last.spokenIn, this.last.rights);
  }

  private turn(
    text: string,
    spokenIn: string | undefined,
    rights: TurnRights,
  ): RunOptions {
    const notes = [
      ...(this.wasStopped
        ? [
            "I stopped your last answer partway; it ends where you were cut off.",
          ]
        : []),
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
    this.wasStopped = false;
    return {
      cwd: this.cwd,
      prompt,
      ...rights,
      session: { id: this.conversation, resume: this.started },
      // A talk without tools of its own (the support kobold) has no server.
      ...(this.toolsUrl
        ? {
            mcp: {
              name: "setup",
              url: this.toolsUrl,
              headers: { [COACH_HEADER]: this.token },
            },
          }
        : {}),
      onText: (reply: string) => {
        this.writing = this.kept?.wrote(reply) ?? reply;
        this.changed();
      },
      onActivity: (line: string) => {
        this.step = Math.max(this.step, stepOf(line)) as Step;
        const kept = this.kept?.took(line);
        if (kept) this.writing = kept;
        const shown = plain(line);
        if (!shown) {
          if (kept) this.changed();
          return;
        }
        this.activity = shown;
        this.changed();
      },
    };
  }
}

// A line of what Claude Code does, as the owner sees it; null to skip.
function plain(line: string): string | null {
  const tool = toolOf(line);
  if (tool) return TOOL_LINES[tool] ?? null;
  return SHOWN.test(line) ? line : null;
}

// Why Claude Code could not answer, in words the owner can act on.
export function problemOf(error: string, who = "The coach"): string {
  if (/ENOENT/.test(error))
    return "Claude Code is not on this computer. Install it from claude.com/code and sign in, then try again.";
  if (/log ?in|auth|credential/i.test(error))
    return "Claude Code is not signed in. Run claude once in a terminal to sign in, then try again.";
  return `${who} stopped: ${error || "no reason given"}. Try again.`;
}

// The map after the owner's own change.
function changedMap(map: Draft, change: ChangeDraft): Draft {
  if ("move" in change) return move(map, change.move);
  if ("remove" in change) return removeCard(map, change.remove);
  if ("edit" in change) {
    const card = map.cards.find((c) => c.id === change.edit.id);
    if (!card) throw new Refused("There is no such card.");
    return writeCard(map, {
      ...card,
      title: change.edit.title ?? card.title,
      text: change.edit.text ?? card.text,
      confirmed: true,
    }).draft;
  }
  return writeCard(map, {
    area: change.add.area,
    title: change.add.title,
    ...(change.add.text ? { text: change.add.text } : {}),
    icon: "person",
    confirmed: true,
  }).draft;
}
