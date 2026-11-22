// The support kobold: the one that is always there, at the bottom of every
// page (the dashboard's support bar), for questions about Kobble and the
// project. The same talk as the other kobolds (coach/talk.ts): it reads the
// project and answers, takes the person to the right place, and hands work
// on to the kobold whose job it is (support-hands.ts): it does nothing
// alone, and changes no file of the project.
// The conversation lives while the factory runs; New conversation starts
// again.

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Claude,
  FACTORY_FOLDER,
  type KobbleStore,
} from "@software-factory/core";
import { guidesFolder } from "@software-factory/skills";

import type { Route } from "../add-ons/add-on.ts";
import { field, optionalText } from "../asked.ts";
import { Talk } from "../coach/talk.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { type SupportCards, supportCards } from "./card-look.ts";
import { connectedCards } from "./connected-cards.ts";
import {
  type HandsOn,
  type SupportHands,
  supportHands,
} from "./support-hands.ts";
import type { SupportTools } from "./support-tools.ts";
import { inLanguage } from "../language.ts";

const RIGHTS = {
  readOnly: true,
  tools: ["Read", "Grep", "Glob"],
  deny: ["Read(**/.env*)"],
};

export type SupportView = {
  messages: { from: "kobold" | "you"; text: string }[];
  writing: string | null;
  activity: string | null;
  problem: string | null;
  // Where it took the person last (an address in the page, #explore/X-3),
  // counted, so the page moves there once.
  went: { to: string; n: number } | null;
};

type SupportOptions = {
  claude: Claude;
  project: string;
  onChange: () => void;
  // The records its tools add to, and what they tell the page.
  store: () => KobbleStore;
  changed: (what: string) => void;
  cards: SupportCards;
  hands: SupportHands;
};

export class SupportTalk {
  private talk: Talk;
  private toolsUrl = "";
  private went: SupportView["went"] = null;
  private readonly options: SupportOptions;

  constructor(options: SupportOptions) {
    this.options = options;
    this.talk = this.fresh();
  }

  get working(): boolean {
    return this.talk.working;
  }

  view(): SupportView {
    return {
      messages: this.talk.messages.map((m) => ({
        from: m.from === "coach" ? "kobold" : "you",
        text: m.text,
      })),
      writing: this.talk.writing,
      activity: this.talk.activity,
      problem: this.talk.problem,
      went: this.went,
    };
  }

  // A question, from the page the person is on; answered in the background.
  say(text: string, page: string | null): void {
    const said = this.talk.heard(text);
    this.options.onChange();
    if (said === null) return;
    const where = page ? `\n\n(They are on the ${page} page.)` : "";
    void this.talk.answer(`${said}${where}`, undefined, {
      ...RIGHTS,
      instructions: inLanguage(
        readFileSync(join(guidesFolder, "support-kobold.md"), "utf8"),
      ),
    });
  }

  // The person pressed Stop while the kobold answered.
  stop(): void {
    this.talk.stop();
  }

  // Where the server answers its tools, once it listens.
  serveToolsAt(url: string): void {
    this.toolsUrl = url;
    this.talk.serveToolsAt(url);
  }

  // Its tools, for this conversation's Claude Code only.
  tools(): SupportTools {
    return {
      token: this.talk.token,
      store: this.options.store,
      changed: this.options.changed,
      cards: this.options.cards,
      hands: this.options.hands,
      go: (to) => {
        this.went = { to, n: (this.went?.n ?? 0) + 1 };
        this.options.onChange();
      },
    };
  }

  // A new conversation; refused while the kobold answers.
  restart(): void {
    if (this.talk.working) return;
    this.talk = this.fresh();
    this.options.onChange();
  }

  private fresh(): Talk {
    const talk = new Talk({
      claude: this.options.claude,
      cwd: this.options.project,
      onChange: this.options.onChange,
    });
    if (this.toolsUrl) talk.serveToolsAt(this.toolsUrl);
    return talk;
  }
}

export function supportRoutes(support: SupportTalk): Record<string, Route> {
  return {
    "GET /api/kobble/support": () => support.view(),
    "POST /api/kobble/support": (body) => {
      support.say(field(body, "text"), optionalText(body, "page") ?? null);
      return support.view();
    },
    "POST /api/kobble/support/stop": () => {
      support.stop();
      return support.view();
    },
    "POST /api/kobble/support/new": () => {
      support.restart();
      return support.view();
    },
  };
}

// The support kobold for the factory's project; its changes told as
// "support".
export function supportOf(
  options: Omit<Parameters<typeof supportCards>[0], "cards"> & {
    claude: Claude;
    cli: Cli;
  },
  store: () => KobbleStore,
  changed: (what: string) => void,
  reach: {
    explorations: { talks: HandsOn["talks"] };
    tests: { tests: HandsOn["tests"] };
  },
): SupportTalk {
  const board = () =>
    connectedCards(join(options.project, FACTORY_FOLDER), options.cli);
  const cards = supportCards({ ...options, cards: board });
  const hands = supportHands({
    talks: reach.explorations.talks,
    tests: reach.tests.tests,
    store,
    cards: board,
    changed,
  });
  return new SupportTalk({
    claude: options.claude,
    project: options.project,
    onChange: () => {
      changed("support");
    },
    store,
    changed,
    cards,
    hands,
  });
}
