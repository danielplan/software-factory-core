// An add-on gives the factory an ability a company may want, or want
// another of in its place (a GitHub board or Jira, where work is tracked):
// what the core loads (its extension: the programs it runs, its settings,
// its guides) and what the server answers for it (its routes). Built-in
// add-ons are on unless the company switches them off.

import type { Changes, Extension } from "@software-factory/core";

import type { Board } from "../connect/board-file.ts";
import { Refused } from "../refused.ts";

export type Route = (body: unknown, url: URL) => unknown;

// What an add-on's routes may ask of the factory.
export type AddOnHost = {
  // Work is tracked with this add-on from now on: its entry in the
  // factory's board.json, and its secrets in its settings group (the one
  // with its id).
  connect: (entry: Board[string], secrets?: Changes) => void;
  // A tool on this computer, installed with the system's package manager.
  installTool: (id: string) => Promise<{ installed: boolean }>;
  // Something the page shows has changed.
  changed: () => void;
};

export type AddOn = {
  extension: Extension;
  // Its routes, by "METHOD /path": answered at /api/add-ons/<id>/path, and
  // only while the factory has it on.
  routes?: (host: AddOnHost) => Record<string, Route>;
};

// Every add-on's routes at their addresses.
export function addOnRoutes(
  addOns: AddOn[],
  host: (id: string) => AddOnHost,
  isOn: (id: string) => boolean,
): Record<string, Route> {
  return Object.fromEntries(
    addOns.flatMap(({ extension, routes }) =>
      Object.entries(routes?.(host(extension.id)) ?? {}).map(
        ([key, route]): [string, Route] => {
          const [method, path] = key.split(" ", 2) as [string, string];
          return [
            `${method} /api/add-ons/${extension.id}${path}`,
            (body, url) => {
              if (!isOn(extension.id))
                throw new Refused(`${extension.name} is off in this factory.`);
              return route(body, url);
            },
          ];
        },
      ),
    ),
  );
}
