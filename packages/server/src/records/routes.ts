// The records' routes: reading them for the Understand pages, bringing in a
// signal from outside (the import API; the connectors that feed it come
// later), which the kobold then sorts, and what a person does on the pages
// (a new source, Move, Looks good, Confirm, Ask, a question to the kobold).
// Like every button, a POST is answered only from the factory's page or a
// program on this computer that sends its header (server.ts). Explore's and prototype mode's routes
// come with them (explore/routes.ts), and Build's (build/routes.ts): they
// work on the same records.

import { randomUUID } from "node:crypto";
import { join } from "node:path";

import {
  type Claude,
  FACTORY_FOLDER,
  importSignalSchema,
  RecordsRefused,
  type RecordStore,
  type Signal,
} from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { buildRoutes } from "../build/routes.ts";
import { checkRoutes } from "../checks/routes.ts";
import { chatRoutes } from "../chat/routes.ts";
import { waitingForAnswer } from "../build/views.ts";
import type { Cards } from "../cards/cards.ts";
import { cardsFor } from "../cards/cards-for.ts";
import { exploreRoutes } from "../explore/routes.ts";
import { Kobold } from "../kobold/kobold.ts";
import { PrototypeMode } from "../prototypes/mode.ts";
import type { JobTools } from "../kobold/tools.ts";
import { asked, field } from "../asked.ts";
import { Refused } from "../refused.ts";
import { RecordsHost } from "./host.ts";
import {
  addSource,
  confirmRealProblem,
  looksGood,
  moveSchema,
  moveSignal,
  parsed,
} from "./person.ts";
import { signalView } from "./signal-views.ts";
import { overview, personaPage, recordsView, storyPage } from "./views.ts";
import { whoIs } from "./who.ts";

// The project's records as the server serves them: their routes, and each
// change told on the page's stream as a `records-changed` event that says
// which records changed (the page reads what it shows of them again), the
// kobold's jobs as `kobold` events, and what runs in prototype mode as
// `prototypes` events. A change to the tickets or their answers also tells
// the board (`onTickets`): which cards ask "did it work?" changes with them.
type ServedOptions = {
  project: string;
  claude: Claude;
  // The GitHub CLI, for sending a version to Build.
  cli: Cli;
  tell: (event: string) => void;
  onTickets: () => void;
  // The issues the connected board shows closed or in the app.
  inApp?: () => ReadonlySet<number>;
};

export function servedRecords(options: ServedOptions) {
  const { project, tell } = options;
  const say = (event: string, data: unknown) => {
    tell(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  const host = new RecordsHost(project);
  host.subscribe((changes) => {
    say("records-changed", { changes });
    if (changes.some((c) => ["ticketLinks", "outcomes"].includes(c.kind)))
      options.onTickets();
  });
  const kobold: Kobold = new Kobold({
    claude: options.claude,
    cwd: project,
    records: () => host.orRefuse(),
    onChange: () => {
      say("kobold", { jobs: kobold.view() });
    },
  });
  const root = join(project, FACTORY_FOLDER);
  const mode: PrototypeMode = new PrototypeMode({
    project,
    root,
    records: () => host.orRefuse(),
    onChange: () => {
      say("prototypes", { runs: mode.view() });
    },
  });
  const cards = () => connectedCards(root, options.cli);
  const inApp = options.inApp ?? (() => new Set<number>());
  return {
    routes: {
      ...readRoutes(host, kobold, inApp),
      ...personRoutes(host, kobold, project),
      ...exploreRoutes({
        host,
        kobold,
        mode,
        project,
        claude: options.claude,
        cards,
        inApp,
      }),
      ...buildRoutes({ host, kobold, project, cards }),
      ...jobRoutes(kobold, project, () => host.orRefuse(), cards),
    },
    waiting: () => waitingIn(host),
    serveToolsAt: (base: string) => {
      kobold.serveToolsAt(`${base}/kobold/mcp`);
    },
    toolsOf: (token: string): JobTools | null => kobold.toolsOf(token),
    close: () => {
      mode.close();
      host.close();
    },
  };
}

// The kobold's jobs started from the chat and the check-up.
function jobRoutes(
  kobold: Kobold,
  project: string,
  records: () => RecordStore,
  cards: () => Cards,
) {
  return {
    ...chatRoutes({ kobold, project }),
    ...checkRoutes({ project, kobold, records, cards }),
  };
}

// The connected board's cards, or refused with why there are none.
function connectedCards(root: string, cli: Cli): Cards {
  const found = cardsFor(root, cli);
  if ("problem" in found) throw new Refused(found.problem);
  return found.cards;
}

// The issues Kobble waits for "did it work?" about; none before the
// factory has its records.
function waitingIn(host: RecordsHost): ReadonlySet<number> {
  try {
    return waitingForAnswer(host.orRefuse().all());
  } catch {
    return new Set();
  }
}

function readRoutes(
  host: RecordsHost,
  kobold: Kobold,
  inApp: () => ReadonlySet<number>,
): Record<string, Route> {
  const records = () => host.orRefuse().all();
  return {
    "GET /api/records": () => recordsView(records()),
    "GET /api/understand": () => overview(records(), inApp()),
    "GET /api/understand/persona": (_body, url) =>
      personaPage(records(), asked(url, "id", "persona"), inApp()),
    "GET /api/understand/story": (_body, url) =>
      storyPage(records(), asked(url, "id", "story"), inApp()),
    "GET /api/understand/signal": (_body, url) =>
      signalView(records(), asked(url, "id", "signal")),
    "GET /api/understand/kobold": () => ({ jobs: kobold.view() }),
    // A new signal, which the kobold sorts.
    "POST /api/signals": (body) => {
      const signal = importSignal(host, body);
      kobold.sort(signal.id);
      return { signal };
    },
  };
}

function personRoutes(
  host: RecordsHost,
  kobold: Kobold,
  project: string,
): Record<string, Route> {
  const store = () => host.orRefuse();
  return {
    "POST /api/sources": (body) => ({ source: addSource(store(), body) }),
    "POST /api/understand/move": async (body) => {
      const move = parsed(moveSchema, body, "move");
      const { signal, to } = move;
      if (to.to !== "newStory")
        return { done: moveSignal(store(), signal, to, await whoIs(project)) };
      if (!store().get("signals", signal)) refuse("signal", signal);
      const of = to.persona ? ` of the persona ${to.persona}` : "";
      const hint = `it starts a new story${of}; it does not belong where it was.`;
      return { job: kobold.sort(signal, hint) };
    },
    "POST /api/understand/looks-good": async (body) => {
      looksGood(store(), field(body, "signal"), await whoIs(project));
    },
    "POST /api/understand/confirm": async (body) => {
      confirmRealProblem(
        store(),
        field(body, "realProblem"),
        await whoIs(project),
      );
    },
    "POST /api/understand/ask": async (body) => ({
      question: await kobold.ask(field(body, "story")),
    }),
    "POST /api/understand/question": async (body) => ({
      answer: await kobold.answer(field(body, "question")),
    }),
  };
}

// A new signal, unsorted: the kobold sorts it. Refused, with why, when it
// does not fit or names a source or customer that is not there.
function importSignal(host: RecordsHost, body: unknown): Signal {
  const store = host.orRefuse();
  const { id = randomUUID(), ...signal } = parsed(
    importSignalSchema,
    body,
    "signal",
  );
  if (store.get("signals", id))
    throw new Refused(`There is a signal “${id}” already.`);
  try {
    return store.put("signals", { ...signal, id });
  } catch (error) {
    if (error instanceof RecordsRefused) throw new Refused(error.message);
    throw error;
  }
}

function refuse(what: string, id: string): never {
  throw new Refused(`There is no ${what} “${id}”.`);
}
