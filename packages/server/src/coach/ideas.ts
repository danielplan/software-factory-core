// The factory's ideas: each a conversation with the idea coach about a map
// of the idea (talk.ts), kept as a file in the factory's ideas/ folder, so
// it lives with the project. The coach reads the code and the factory's
// knowledge, and works the idea out with the owner; once the plan is clear the
// owner marks it ready (later, it goes to where work is tracked).

import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type { Claude } from "@software-factory/core";

import type { ChangeDraft, CoachMessage, Draft, IdeaView } from "../api.ts";
import { Refused } from "../refused.ts";
import { type Drawing, EMPTY } from "./map.ts";
import { pictureIn } from "./pictures.ts";
import type { ToolsFor } from "./setup-tools.ts";
import { Talk } from "./talk.ts";

export const IDEAS_FOLDER = "ideas";

const RIGHTS = {
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  deny: ["Read(**/.env*)"],
};

// What an idea's file keeps.
type Kept = {
  id: string;
  title: string;
  status: IdeaView["status"];
  created: string;
  updated: string;
  conversation: string;
  messages: CoachMessage[];
  map: Draft;
};

type IdeasOptions = {
  claude: Claude;
  // The factory's folder (ideas/ is in it) and the project (where the coach
  // reads).
  root: string;
  project: string;
  guide: string;
  onChange: () => void;
};

class Idea {
  readonly talk: Talk;
  kept: Omit<Kept, "conversation" | "messages" | "map">;
  private file: string;

  constructor(file: string, options: IdeasOptions, kept: Kept) {
    this.file = file;
    const { conversation, messages, map, ...rest } = kept;
    this.kept = rest;
    this.talk = new Talk({
      claude: options.claude,
      cwd: options.project,
      onChange: () => {
        options.onChange();
        // Kept once a turn is over, not while the reply is written.
        if (!this.talk.working) this.save();
      },
      kept: { conversation, messages, map },
    });
  }

  view(): IdeaView {
    const { talk } = this;
    return {
      ...this.kept,
      messages: talk.messages,
      writing: talk.writing,
      activity: talk.activity,
      working: talk.working,
      started: true,
      problem: talk.problem,
      draft: talk.map,
      phase: "plan",
      made: false,
    };
  }

  save(): void {
    this.kept = { ...this.kept, updated: new Date().toISOString() };
    const kept: Kept = {
      ...this.kept,
      conversation: this.talk.id,
      messages: this.talk.messages,
      map: this.talk.map,
    };
    writeFileSync(this.file, `${JSON.stringify(kept, null, 2)}\n`);
  }
}

export class Ideas {
  private options: IdeasOptions;
  private ideas = new Map<string, Idea>();
  private toolsUrl = "";

  constructor(options: IdeasOptions) {
    this.options = options;
    const folder = this.folder();
    if (!existsSync(folder)) return;
    for (const name of readdirSync(folder).filter((n) => n.endsWith(".json"))) {
      const kept = JSON.parse(readFileSync(join(folder, name), "utf8")) as Kept;
      this.ideas.set(kept.id, new Idea(join(folder, name), options, kept));
    }
  }

  // Newest first.
  list(): IdeaView[] {
    return [...this.ideas.values()]
      .map((idea) => idea.view())
      .sort((a, b) => b.updated.localeCompare(a.updated));
  }

  // Where the server answers each idea's tools (its id is added).
  serveToolsAt(url: string): void {
    this.toolsUrl = url;
    for (const [id, idea] of this.ideas) idea.talk.serveToolsAt(`${url}/${id}`);
  }

  // A new idea from the owner's first words; the coach answers while the
  // page opens it.
  create(text: string): string {
    const words = text.trim();
    if (!words) throw new Refused("Say what the idea is first.");
    const id = randomUUID().slice(0, 8);
    const now = new Date().toISOString();
    mkdirSync(this.folder(), { recursive: true });
    const idea = new Idea(join(this.folder(), `${id}.json`), this.options, {
      id,
      title: titleOf(words),
      status: "draft",
      created: now,
      updated: now,
      conversation: randomUUID(),
      messages: [],
      map: EMPTY,
    });
    idea.talk.serveToolsAt(`${this.toolsUrl}/${id}`);
    this.ideas.set(id, idea);
    void this.say(id, words);
    return id;
  }

  async say(id: string, text: string, spokenIn?: string): Promise<void> {
    const idea = this.idea(id);
    const said = idea.talk.heard(text);
    await idea.talk.answer(said, spokenIn?.trim().slice(0, 40), {
      ...RIGHTS,
      instructions: this.options.guide,
    });
  }

  // The idea's map, and its title if the coach gives one.
  draw(
    id: string,
    { title, ...drawing }: Drawing & { title?: string },
    picture: (path: string) => string,
  ): string {
    const idea = this.idea(id);
    if (title?.trim())
      idea.kept = { ...idea.kept, title: title.trim().slice(0, 80) };
    return idea.talk.draw(drawing, picture);
  }

  ownerChange(id: string, change: ChangeDraft): void {
    this.idea(id).talk.ownerChange(change);
  }

  // The owner agrees to the plan.
  ready(id: string): void {
    const idea = this.idea(id);
    if (idea.talk.working) throw new Refused("The coach is still answering.");
    idea.kept = { ...idea.kept, status: "backlog" };
    idea.save();
    this.options.onChange();
  }

  discard(id: string): void {
    this.idea(id);
    this.ideas.delete(id);
    rmSync(join(this.folder(), `${id}.json`), { force: true });
    this.options.onChange();
  }

  // An idea's tools: only its map, with pictures from the project.
  toolsFor(id: string): ToolsFor {
    return {
      token: this.token(id),
      titled: true,
      draw: (drawing) =>
        this.draw(id, drawing, (path) => pictureIn(this.options.project, path)),
    };
  }

  token(id: string): string {
    return this.idea(id).talk.token;
  }

  // Whether a card on any idea's map shows this picture.
  shows(path: string): boolean {
    return [...this.ideas.values()].some((idea) =>
      idea.talk.map.cards.some((card) => card.picture === path),
    );
  }

  private idea(id: string): Idea {
    const idea = this.ideas.get(id);
    if (!idea) throw new Refused("There is no such idea.");
    return idea;
  }

  private folder(): string {
    return join(this.options.root, IDEAS_FOLDER);
  }
}

// The idea's first few words, until the coach gives it a title.
function titleOf(words: string): string {
  const all = (words.split("\n")[0] ?? words).split(/\s+/).filter(Boolean);
  const first = all.slice(0, 6).join(" ");
  return all.length > 6 ? `${first}…` : first;
}
