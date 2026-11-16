// The records' routes: reading them for the Understand pages, and bringing
// in a signal from outside (the import API; the connectors that feed it come
// later). Like every button, an import is answered only from the factory's
// page or a program on this computer that sends its header (server.ts).

import { randomUUID } from "node:crypto";

import {
  importSignalSchema,
  RecordsRefused,
  type Signal,
} from "@software-factory/core";
import { z } from "zod";

import type { Route } from "../add-ons/add-on.ts";
import { Refused } from "../refused.ts";
import { RecordsHost } from "./host.ts";
import { overview, personaPage, recordsView, storyPage } from "./views.ts";

// The project's records as the server serves them: their routes, and each
// change told on the page's stream as a `records-changed` event that says
// which records changed (the page reads what it shows of them again).
export function servedRecords(
  project: string,
  tell: (event: string) => void,
): { routes: Record<string, Route>; close: () => void } {
  const host = new RecordsHost(project);
  host.subscribe((changes) => {
    tell(`event: records-changed\ndata: ${JSON.stringify({ changes })}\n\n`);
  });
  return {
    routes: recordRoutes(host),
    close: () => {
      host.close();
    },
  };
}

function recordRoutes(host: RecordsHost): Record<string, Route> {
  const records = () => host.orRefuse().all();
  return {
    "GET /api/records": () => recordsView(records()),
    "GET /api/understand": () => overview(records()),
    "GET /api/understand/persona": (_body, url) =>
      personaPage(records(), asked(url, "id", "persona")),
    "GET /api/understand/story": (_body, url) =>
      storyPage(records(), asked(url, "id", "story")),
    "POST /api/signals": (body) => ({ signal: importSignal(host, body) }),
  };
}

// A new signal, unsorted: the kobold sorts it. Refused, with why, when it
// does not fit or names a source or customer that is not there.
function importSignal(host: RecordsHost, body: unknown): Signal {
  const store = host.orRefuse();
  const parsed = importSignalSchema.safeParse(body);
  if (!parsed.success)
    throw new Refused(
      `This signal does not fit: ${z.prettifyError(parsed.error)}`,
    );
  const { id = randomUUID(), ...signal } = parsed.data;
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
