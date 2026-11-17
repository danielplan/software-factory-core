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

import { EMPTY } from "../../coach/map.ts";
import { Talk } from "../../coach/talk.ts";
import { Refused } from "../../refused.ts";
import { type BoardChange, boardText, changeBoard } from "./board-edit.ts";
import type { BoardTools } from "./board-tools.ts";

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
};

type TalksOptions = {
  claude: Claude;
  project: string;
  store: () => KobbleStore;
  onChange: () => void;
};

export class ExplorationTalks {
  private readonly talks = new Map<string, Talk>();
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
      };
    return {
      messages: talk.messages.map((m) => ({
        from: m.from === "coach" ? "kobold" : "you",
        text: m.text,
      })),
      writing: talk.writing,
      activity: talk.activity,
      problem: talk.problem,
    };
  }

  // A person's words; the kobold answers with the board in front of it.
  async say(id: string, text: string): Promise<void> {
    const talk = this.talk(id);
    const said = talk.heard(text);
    await this.answer(id, talk, said);
  }

  // The kobold's first look, when the exploration starts.
  async begin(id: string): Promise<void> {
    const talk = this.talk(id);
    if (talk.working || talk.messages.length > 0) return;
    await this.answer(
      id,
      talk,
      "We start this exploration. Read the problem and what we heard, put a question and two or three ways to answer it on the board, and ask what matters most.",
    );
  }

  tools(id: string): BoardTools {
    const talk = this.talk(id);
    return { token: talk.token, change: (change) => this.change(id, change) };
  }

  private change(id: string, change: BoardChange): string {
    const store = this.options.store();
    const exploration = store.get("explorations", id);
    if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
    const { title, problem } = change;
    const now = store.put("explorations", {
      ...exploration,
      title: title?.trim() || exploration.title,
      problem: problem?.trim() ?? exploration.problem,
    });
    const board = store.saveBoard(id, changeBoard(store.board(id), change));
    this.options.onChange();
    return boardText(now, board);
  }

  private async answer(id: string, talk: Talk, said: string): Promise<void> {
    const store = this.options.store();
    const exploration = store.get("explorations", id);
    if (!exploration) throw new Refused(`There is no exploration “${id}”.`);
    const heard = store
      .all("signals")
      .filter((signal) => exploration.signals.includes(signal.id))
      .map((signal) => `- ${signal.text}`);
    const prompt = [
      said,
      "",
      "(The board now:",
      boardText(exploration, store.board(id)),
      ...(heard.length > 0 ? ["What we heard:", ...heard] : []),
      ")",
    ].join("\n");
    await talk.answer(prompt, undefined, {
      ...RIGHTS,
      instructions: readFileSync(
        join(guidesFolder, "exploration-coach.md"),
        "utf8",
      ),
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
