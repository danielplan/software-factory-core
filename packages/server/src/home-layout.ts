// Prototype: Home's arrangement, one for the whole team. Kept in the
// factory's folder (factory/home.json), beside its other settings; the page
// reads it again when it changes (GET and POST /api/home-layout).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FACTORY_FOLDER } from "@software-factory/core";

import type { Route } from "./add-ons/add-on.ts";
import { Refused } from "./refused.ts";

const BLOCKS = [
  "status",
  "waiting",
  "loop",
  "exploring",
  "signals",
  "reviews",
  "failed",
];

type Layout = { order: string[]; hidden: string[] };

const listOf = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((one) => BLOCKS.includes(String(one)))
    ? value.map(String)
    : null;

export function homeLayoutRoutes(
  project: string,
  changed: (what: string) => void,
): Record<string, Route> {
  const file = join(project, FACTORY_FOLDER, "home.json");
  return {
    // null: nobody arranged Home yet, the page shows its own.
    "GET /api/home-layout": () => ({
      layout: existsSync(file)
        ? (JSON.parse(readFileSync(file, "utf8")) as Layout)
        : null,
    }),
    "POST /api/home-layout": (body) => {
      const { order, hidden } = (body ?? {}) as Record<string, unknown>;
      const layout = { order: listOf(order), hidden: listOf(hidden) };
      if (!layout.order || !layout.hidden)
        throw new Refused("That is not an arrangement of Home.");
      mkdirSync(join(project, FACTORY_FOLDER), { recursive: true });
      writeFileSync(file, `${JSON.stringify(layout, null, 2)}\n`);
      changed("home");
    },
  };
}
