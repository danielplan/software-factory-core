// Home's arrangement: which blocks it shows and in what order, one Home for
// the whole team. Kept in the factory's folder (factory/home.json), beside
// its other settings; the page reads it again when it changes (GET and POST
// /api/home-layout). Nothing there yet means nobody arranged Home: the page
// shows the blocks it starts with. A block is named by its id, as the
// extension that brings it names it; one whose extension is not installed is
// kept in the file and simply not shown, and comes back with it. One that no
// extension brings at all any more (a team's extension whose folder is gone)
// is let go when Home is next saved.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";

import type { Route } from "./add-ons/add-on.ts";
import { Refused } from "./refused.ts";

type Layout = { order: string[]; hidden: string[] };

const ID = /^[a-z][a-z0-9-]*$/;
// More blocks than any factory has: a guard against a file that is not one.
const MOST = 200;

const idsOf = (value: unknown): string[] | null =>
  Array.isArray(value) &&
  value.length <= MOST &&
  value.every((one) => typeof one === "string" && ID.test(one))
    ? [...new Set(value as string[])]
    : null;

function layoutIn(file: string): Layout | null {
  if (!existsSync(file)) return null;
  try {
    const read = JSON.parse(readFileSync(file, "utf8")) as Record<
      string,
      unknown
    >;
    const order = idsOf(read.order);
    const hidden = idsOf(read.hidden);
    return order && hidden ? { order, hidden } : null;
  } catch {
    // A file edited by hand into something unreadable: Home starts again.
    return null;
  }
}

export function homeLayoutRoutes(
  project: string,
  changed: (what: string) => void,
  // Every block any extension brings; without it nothing is let go.
  known?: () => string[],
): Record<string, Route> {
  const folder = join(project, FACTORY_FOLDER);
  const file = join(folder, "home.json");
  return {
    "GET /api/home-layout": () => ({ layout: layoutIn(file) }),
    "POST /api/home-layout": (body) => {
      const { order, hidden } = (body ?? {}) as Record<string, unknown>;
      const asked = { order: idsOf(order), hidden: idsOf(hidden) };
      if (!asked.order || !asked.hidden)
        throw new Refused("That is not an arrangement of Home.");
      const exists = new Set(known?.());
      const kept = (ids: string[]) =>
        known ? ids.filter((one) => exists.has(one)) : ids;
      const layout = { order: kept(asked.order), hidden: kept(asked.hidden) };
      mkdirSync(folder, { recursive: true });
      writeFileSync(file, `${JSON.stringify(layout, null, 2)}\n`);
      changed("home");
    },
  };
}
