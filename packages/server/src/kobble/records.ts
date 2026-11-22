// Kobble's records (core's KobbleStore) as the server keeps them: once the
// factory is there, with every change also written to the usage log when
// the company switched it on; and what the records answer, a file that
// does not fit refused with why.

import {
  hasFactory,
  KobbleRefused,
  KobbleStore,
  usageFolder,
} from "@software-factory/core";

import type { Route } from "../http.ts";
import { Refused } from "../refused.ts";
import { LoggedStore } from "./logged-store.ts";
import { UsageLog } from "./usage-log.ts";

// The usage log, when it is switched on.
export function usageOf(factory: string, project: string): UsageLog | null {
  const folder = usageFolder(factory, project);
  return folder ? new UsageLog(folder) : null;
}

// The records once the factory is there (none in setup); every change also
// goes to the usage log when it is on.
export function storeOf(factory: string, project: string): KobbleStore | null {
  if (!hasFactory(factory)) return null;
  const log = usageOf(factory, project);
  return log
    ? new LoggedStore(factory, project, log)
    : new KobbleStore(factory);
}

// What the records answer; a file that does not fit is refused with why.
export async function kept<T>(read: () => T | Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof KobbleRefused) throw new Refused(error.message);
    throw error;
  }
}

// Routes whose records may not fit: refused with why.
export function keptAll(routes: Record<string, Route>): Record<string, Route> {
  return Object.fromEntries(
    Object.entries(routes).map(([name, route]) => [
      name,
      (body: unknown, url: URL) => kept(() => route(body, url)),
    ]),
  );
}
