// The feedback board's routes: what is on it (to find a similar post), what
// this person sent and where each stands, and sending (a new post, or a 👍
// on one there). Sending uses the person's own GitHub sign-in.

import { join } from "node:path";

import {
  type Claude,
  FACTORY_FOLDER,
  type KobbleStore,
  RELEASE_SOURCE,
} from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { field } from "../asked.ts";
import { Refused } from "../refused.ts";
import { FeedbackArrivals } from "./arrivals.ts";
import {
  boardOf,
  FeedbackBoard,
  KINDS,
  type Kind,
  type Post,
} from "./board.ts";

export type FeedbackView = {
  board: string;
  url: string;
  // Signed in to GitHub as.
  login: string | null;
  // The posts on the board, to find a similar one.
  posts: Post[];
  // What this person sent, or gave a 👍, newest first, as the board has it.
  mine: (Post & { own: boolean })[];
};

type Options = {
  project: string;
  cli: Cli;
  claude: Claude;
  store: () => KobbleStore | null;
  changed: () => void;
  // Signals changed (some arrived, or a persona was changed).
  onSignals: () => void;
  // The board's repository: the core's own, beside its releases.
  repository?: string;
};

export function feedbackRoutes(options: Options) {
  const { project, changed } = options;
  const factory = join(project, FACTORY_FOLDER);
  const board = new FeedbackBoard(
    options.cli,
    options.repository ?? boardOf(RELEASE_SOURCE),
    join(factory, "settings", "feedback-sent.json"),
  );
  const arrivals = new FeedbackArrivals({
    board,
    store: options.store,
    claude: options.claude,
    factory,
    cwd: project,
    onChange: () => {
      changed();
      options.onSignals();
    },
  });
  const routes = {
    ...boardRoutes(board, changed),
    ...personaRoute(options),
  };
  return { routes, arrivals };
}

// Changing or removing the persona the kobold matched to a post.
function personaRoute(options: Options): Record<string, Route> {
  return {
    "POST /api/feedback/persona": (body) => {
      const store = options.store();
      if (!store) throw new Refused("There is no factory yet.");
      const id = field(body, "id");
      const persona = (body as { persona?: unknown } | null)?.persona;
      const signal = store.get("signals", id);
      if (signal?.source !== "feedback")
        throw new Refused("That is not a post from the feedback board.");
      if (persona !== null && typeof persona !== "string")
        throw new Refused("Say which persona, or none.");
      if (persona !== null && !store.get("personas", persona))
        throw new Refused("There is no such persona.");
      // A persona picked by a person has no reason of the kobold's.
      const rest = { ...signal, persona };
      delete rest.why;
      store.put("signals", rest);
      options.onSignals();
    },
  };
}

// What is on the board, what this person sent, and sending.
function boardRoutes(
  board: FeedbackBoard,
  changed: () => void,
): Record<string, Route> {
  return {
    "GET /api/feedback": async (): Promise<FeedbackView> => {
      const [login, posts] = await Promise.all([board.login(), board.posts()]);
      const mine = board.sent().flatMap((one) => {
        const post =
          posts.find((there) => there.number === one.number) ?? one.post;
        return post ? [{ ...post, own: one.own }] : [];
      });
      return {
        board: board.repository,
        url: `https://github.com/${board.repository}/issues`,
        login,
        posts,
        mine,
      };
    },
    "POST /api/feedback/send": async (body) => {
      const kind = field(body, "kind");
      if (!KINDS.includes(kind as Kind))
        throw new Refused("Say whether it is a bug or a wish.");
      const title = field(body, "title").trim().slice(0, 200);
      const text = (body as { body?: unknown }).body;
      const post = await board.send(
        kind as Kind,
        title,
        typeof text === "string" ? text : "",
      );
      changed();
      return post;
    },
    "POST /api/feedback/thumb": async (body) => {
      const number = Number((body as { number?: unknown } | null)?.number);
      if (!Number.isInteger(number) || number < 1)
        throw new Refused("Say which post.");
      await board.thumb(number);
      changed();
    },
  };
}
