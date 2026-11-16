// The records' routes: reading them for the Understand pages, bringing in a
// signal from outside (the import API; the connectors that feed it come
// later), which the kobold then sorts, and what a person does on the pages
// (a new source, Move, Looks good, Confirm, Ask). Like every button, a POST
// is answered only from the factory's page or a program on this computer
// that sends its header (server.ts).

import { randomUUID } from "node:crypto";

import {
  type Claude,
  importSignalSchema,
  RecordsRefused,
  type Signal,
} from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import { Kobold } from "../kobold/kobold.ts";
import type { JobTools } from "../kobold/tools.ts";
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
// which records changed (the page reads what it shows of them again), and
// the kobold's jobs as `kobold` events.
export function servedRecords(options: {
  project: string;
  claude: Claude;
  tell: (event: string) => void;
}) {
  const { project, tell } = options;
  const host = new RecordsHost(project);
  host.subscribe((changes) => {
    tell(`event: records-changed\ndata: ${JSON.stringify({ changes })}\n\n`);
  });
  const kobold: Kobold = new Kobold({
    claude: options.claude,
    cwd: project,
    records: () => host.orRefuse(),
    onChange: () => {
      tell(
        `event: kobold\ndata: ${JSON.stringify({ jobs: kobold.view() })}\n\n`,
      );
    },
  });
  return {
    routes: {
      ...readRoutes(host, kobold),
      ...personRoutes(host, kobold, project),
    },
    serveToolsAt: (base: string) => {
      kobold.serveToolsAt(`${base}/kobold/mcp`);
    },
    toolsOf: (token: string): JobTools | null => kobold.toolsOf(token),
    close: () => {
      host.close();
    },
  };
}

function readRoutes(host: RecordsHost, kobold: Kobold): Record<string, Route> {
  const records = () => host.orRefuse().all();
  return {
    "GET /api/records": () => recordsView(records()),
    "GET /api/understand": () => overview(records()),
    "GET /api/understand/persona": (_body, url) =>
      personaPage(records(), asked(url, "id", "persona")),
    "GET /api/understand/story": (_body, url) =>
      storyPage(records(), asked(url, "id", "story")),
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

function asked(url: URL, key: string, what: string): string {
  const value = url.searchParams.get(key);
  if (!value) throw new Refused(`Say which ${what}.`);
  return value;
}

function field(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | null)?.[key];
  if (typeof value !== "string" || !value)
    throw new Refused(`Say which ${key}.`);
  return value;
}

function refuse(what: string, id: string): never {
  throw new Refused(`There is no ${what} “${id}”.`);
}
