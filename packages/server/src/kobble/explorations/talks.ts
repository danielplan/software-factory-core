// The conversation with the kobold about each exploration: the same talk
// the idea coach holds (coach/talk.ts), with one tool, `board`, that
// changes the exploration's board while it talks (board-tools.ts). What
// was said is kept in the exploration's conversation.md once each turn is
// over, with Claude Code's conversation id to go on with it.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Claude, KobbleStore } from "@software-factory/core";
import { guidesFolder } from "@software-factory/skills";

import { productPicture } from "./product-picture.ts";

import { EMPTY } from "../../coach/map.ts";
import { Talk } from "../../coach/talk.ts";
import { Refused } from "../../refused.ts";
import { type Act, applyAct } from "./board-acts.ts";
import { boardText, completed } from "./board-things.ts";
import type { BoardTools } from "./board-tools.ts";
import type { ExplorationWorlds } from "./worlds.ts";

const RIGHTS = {
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  deny: ["Read(**/.env*)"],
};

export type TalkView = {
  messages: { from: "kobold" | "you"; text: string }[];
  writing: string | null;
  activity: string | null;
  problem: string | null;
  // The thing the kobold points at, and how many times it pointed (so the
  // page moves there again when it points at the same thing).
  pointed: { thing: string; times: number } | null;
};

type TalksOptions = {
  claude: Claude;
  project: string;
  // The factory's folder: its products, for the kobold's picture of them.
  root?: string;
  store: () => KobbleStore;
  // The made-up worlds the explorations' prototypes share.
  worlds: ExplorationWorlds;
  onChange: () => void;
};

export class ExplorationTalks {
  private readonly talks = new Map<string, Talk>();
  private readonly pointed = new Map<
    string,
    { thing: string; times: number }
  >();
  // What people did on a board since the kobold last heard, by exploration.
  private readonly done = new Map<string, string[]>();
  private toolsUrl = "";
  private readonly options: TalksOptions;

  constructor(options: TalksOptions) {
    this.options = options;
  }

  // Where the server answers each exploration's tools (its id is added).
  serveToolsAt(url: string): void {
    this.toolsUrl = url;
    for (const [id, talk] of this.talks) talk.serveToolsAt(`${url}/${id}`);
  }

  view(id: string): TalkView {
    const talk = this.talks.get(id);
    if (!talk)
      return {
        messages: this.options.store().conversation(id).messages,
        writing: null,
        activity: null,
        problem: null,
        pointed: null,
      };
    return {
      messages: talk.messages.map((m) => ({
        from: m.from === "coach" ? "kobold" : "you",
        text: m.text,
      })),
      writing: talk.writing,
      activity: talk.activity,
      problem: talk.problem,
      pointed: this.pointed.get(id) ?? null,
    };
  }

  // What a person did on the board, for the kobold to hear next time.
  // How the kobold starts making a prototype (the exploration's
  // prototypes, set once both exist).
  private maker: ((id: string, choice: string, option: string) => void) | null =
    null;

  makeWith(maker: (id: string, choice: string, option: string) => void): void {
    this.maker = maker;
  }

  personDid(id: string, words: string): void {
    this.done.set(id, [...(this.done.get(id) ?? []), words]);
  }

  // A person's words, with the things they attached from the board; the
  // kobold answers with the board in front of it.
  async say(
    id: string,
    text: string,
    attached: string[] = [],
    spokenIn?: string,
  ): Promise<void> {
    const talk = this.talk(id);
    const said = talk.heard(text);
    const board = this.options.store().board(id);
    const named = attached.flatMap((thing) => {
      const found = board.things.find((one) => one.id === thing);
      return found ? [`${found.kind} ${found.id}`] : [];
    });
    const more =
      named.length > 0
        ? `\n\n(They attached, from the board: ${named.join(", ")}.)`
        : "";
    await this.answer(id, talk, `${said}${more}`, spokenIn);
  }

  // The kobold's first look, when the exploration starts.
  async begin(id: string): Promise<void> {
    const talk = this.talk(id);
    if (talk.working || talk.messages.length > 0) return;
    await this.answer(
      id,
      talk,
      "We start this exploration. Read the problem and what we heard, put a choice with two or three ways on the board (and a diagram if it helps), link the problem to it, and ask what matters most.",
    );
  }

  tools(id: string): BoardTools {
    const talk = this.talk(id);
    return {
      token: talk.token,
      world: { worlds: this.options.worlds, id },
      act: (act) => this.act(id, act, "kobold").said,
      look: () => this.look(id),
      point: (thing) => {
        const store = this.options.store();
        const exploration = store.get("explorations", id);
        if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
        if (
          !completed(exploration, store.board(id)).things.some(
            (one) => one.id === thing,
          )
        )
          throw new Refused(`There is no thing “${thing}” on the board.`);
        const times = (this.pointed.get(id)?.times ?? 0) + 1;
        this.pointed.set(id, { thing, times });
        this.options.onChange();
        return `Pointing at ${thing}.`;
      },
      make: (choice, option) => {
        if (!this.maker) throw new Refused("Prototypes cannot be made here.");
        this.maker(id, choice, option);
        return `Making the prototype of ${option} on ${choice}; it is on the board now.\n\n${this.look(id)}`;
      },
      rename: ({ title, problem }) => {
        const store = this.options.store();
        const exploration = store.get("explorations", id);
        if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
        store.put("explorations", {
          ...exploration,
          title: title?.trim() || exploration.title,
          problem: problem?.trim() || exploration.problem,
        });
        this.options.onChange();
        return this.look(id);
      },
    };
  }

  // A change to the board, by the kobold or a person; what it did and the
  // board now.
  act(id: string, act: Act, by: "kobold" | "person"): { said: string } {
    const store = this.options.store();
    const exploration = store.get("explorations", id);
    if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
    const done = applyAct(completed(exploration, store.board(id)), act, by);
    store.saveBoard(id, done.board);
    this.options.onChange();
    return { said: `${done.said}\n\n${this.look(id)}` };
  }

  private look(id: string): string {
    const store = this.options.store();
    const exploration = store.get("explorations", id);
    if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
    return boardText(exploration, store.board(id));
  }

  private async answer(
    id: string,
    talk: Talk,
    said: string,
    spokenIn?: string,
  ): Promise<void> {
    const store = this.options.store();
    const exploration = store.get("explorations", id);
    if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
    const heard = exploration.heard.map((one) => `- ${one.text}`);
    const did = this.done.get(id) ?? [];
    this.done.delete(id);
    const prompt = [
      said,
      ...(did.length > 0
        ? ["", `(Since you last spoke, they ${did.join("; ")}.)`]
        : []),
      "",
      "(The board now:",
      boardText(exploration, store.board(id)),
      ...(heard.length > 0 ? ["What we heard:", ...heard] : []),
      ")",
    ].join("\n");
    await talk.answer(prompt, spokenIn, {
      ...RIGHTS,
      instructions: [
        readFileSync(join(guidesFolder, "exploration-coach.md"), "utf8"),
        productPicture(this.options.root ?? "", this.options.project),
      ].join("\n\n"),
    });
  }

  private talk(id: string): Talk {
    const known = this.talks.get(id);
    if (known) return known;
    const store = this.options.store();
    if (!store.get("explorations", id))
      throw new Refused(`There is no exploration “${id}”.`);
    const kept = store.conversation(id);
    const talk: Talk = new Talk({
      claude: this.options.claude,
      cwd: this.options.project,
      onChange: () => {
        this.options.onChange();
        if (!talk.working) this.save(id, talk);
      },
      kept: {
        conversation: kept.session ?? randomUUID(),
        started: kept.session !== null,
        messages: kept.messages.map((m) => ({
          from: m.from === "kobold" ? "coach" : "owner",
          text: m.text,
        })),
        map: EMPTY,
      },
    });
    talk.serveToolsAt(`${this.toolsUrl}/${id}`);
    this.talks.set(id, talk);
    return talk;
  }

  private save(id: string, talk: Talk): void {
    this.options.store().saveConversation(id, {
      session: talk.messages.some((m) => m.from === "coach") ? talk.id : null,
      messages: talk.messages.map((m) => ({
        from: m.from === "coach" ? "kobold" : "you",
        text: m.text,
      })),
    });
  }
}
