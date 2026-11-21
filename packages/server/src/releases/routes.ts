// The Releases page's routes: the coming release (what was merged since the
// last one, the number the kobold suggests and why) with the past releases,
// and making a release. Like every button, a POST is answered only from the
// factory's page (server.ts); a release made is told on the page's stream.

import { join } from "node:path";

import { type Claude, FACTORY_FOLDER } from "@software-factory/core";

import type { Route } from "../add-ons/add-on.ts";
import type { Cli } from "../add-ons/github/github.ts";
import { field } from "../asked.ts";
import { cardsFor } from "../cards/cards-for.ts";
import { Refused } from "../refused.ts";
import { githubReleases, type Past, type Releases } from "./github-releases.ts";
import { Judge } from "./judge.ts";
import { type Merged, notesOf } from "./notes.ts";
import { checkNumber, lastNumber, nextNumber } from "./numbers.ts";

type Options = {
  project: string;
  cli: Cli;
  claude: Claude;
  // Tells the page that releases changed.
  changed: (what: string) => void;
};

export type ReleasesView =
  | { connected: false; problem: string }
  | {
      connected: true;
      repository: string;
      // The last release's number; none before the first.
      last: string | null;
      coming: {
        merged: Omit<Merged, "body">[];
        next: string;
        // Why the number goes up the way it does; none when the kobold could
        // not tell (it suggests the last number, and the page says so).
        why: string | null;
      };
      past: Past[];
    };

export const NO_REPOSITORY =
  "No GitHub repository is connected yet, and releases need one. Connect one in [Settings](#settings), under Where work is tracked.";

export function releasesRoutes(options: Options): Record<string, Route> {
  const factory = join(options.project, FACTORY_FOLDER);
  const judge = new Judge(options.claude, options.project);
  const releasesOf = (): Releases => {
    const found = cardsFor(factory, options.cli);
    if ("problem" in found) throw new Refused(NO_REPOSITORY);
    return githubReleases(options.cli, found.repository);
  };
  return {
    "GET /api/releases": async (): Promise<ReleasesView> => {
      const found = cardsFor(factory, options.cli);
      if ("problem" in found)
        return { connected: false, problem: NO_REPOSITORY };
      const releases = githubReleases(options.cli, found.repository);
      const [coming, past] = await Promise.all([
        comingRelease(releases, judge),
        releases.past(),
      ]);
      return {
        connected: true,
        repository: found.repository,
        last: coming.last,
        coming: {
          merged: coming.merged.map(({ number, title, url, type }) => ({
            number,
            title,
            url,
            type,
          })),
          next: coming.next,
          why: coming.why,
        },
        past,
      };
    },
    "POST /api/releases": async (body) => {
      const releases = releasesOf();
      const wanted = field(body, "number");
      const coming = await comingRelease(releases, judge);
      if (coming.merged.length === 0)
        throw new Refused(
          coming.last
            ? `Nothing was merged since ${coming.last}, so there is nothing to release.`
            : "Nothing was merged yet, so there is nothing to release.",
        );
      const number = checkNumber(wanted, coming.last, coming.tags);
      await releases.make(
        number,
        coming.why,
        notesOf(coming.why, coming.merged),
      );
      options.changed("releases");
      return { number };
    },
  };
}

// What the next release would hold, and the number suggested for it.
async function comingRelease(releases: Releases, judge: Judge) {
  const tags = await releases.tags();
  const last = lastNumber(tags);
  const merged = await releases.merged(last);
  const judged = merged.length > 0 ? await judge.judge(last, merged) : null;
  return {
    tags,
    last,
    merged,
    next: nextNumber(last, judged?.act ?? false),
    why: judged?.why ?? null,
  };
}
