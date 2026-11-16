// What prototype mode shows for an idea (GET /api/prototypes?idea=): every
// version of it, shared or not, each with what it is doing now, and
// whether the project can run versions at all (it names a start command).
// The web interface imports these types only.

import type { Version } from "@software-factory/core";

import { Refused } from "../refused.ts";
import { companyOf } from "../prototypes/copies.ts";
import type { PrototypeMode, VersionRun } from "../prototypes/mode.ts";

export type PrototypePage = {
  idea: { id: string; title: string };
  versions: (Version & { run: VersionRun })[];
  canRun: boolean;
};

export function prototypePage(mode: PrototypeMode, id: string): PrototypePage {
  const records = mode.options.records();
  const idea = records.get("ideas", id);
  if (!idea) throw new Refused(`There is no idea “${id}”.`);
  return {
    idea: { id, title: idea.title },
    versions: records
      .list("versions")
      .filter((v) => v.idea === id)
      .map((v) => ({ ...v, run: mode.runOf(id, v.key) })),
    canRun: companyOf(mode.options.root).prototype !== undefined,
  };
}
