// The Releases page's routes: the coming release (what was merged since the
// last one, and once the team prepared it, the number the kobold suggests,
// why, and the notes it drafted) with the past releases; preparing a
// release, the only time the kobold is asked; and making one. Like every
// button, a POST is answered only from the factory's page (app/server.ts);
// a release made is told on the page's stream.

import { join } from "node:path";

import {
  type Claude,
  type Extension,
  FACTORY_FOLDER,
  type ReleaseNotes,
} from "@software-factory/core";

import type { Route } from "../../http.ts";
import { field } from "../../asked.ts";
import { cardsFor, type TaskBoards } from "../../cards/cards-for.ts";
import { codeHostFor, type CodeHosts } from "../../code-host.ts";
import { Refused } from "../../refused.ts";
import { Judge } from "./judge.ts";
import { bodyOf, listedNotes, type Merged } from "./notes.ts";
import { checkNumber, lastNumber, nextNumber } from "./numbers.ts";
import {
  type Past,
  productReleases,
  type Releases,
} from "./product-releases.ts";

type Options = {
  project: string;
  // Where work is tracked: its board names the repository (the `tasks`
  // slot).
  boards: TaskBoards;
  // Where the code lives: its host makes the releases (the `code` slot).
  hosts: CodeHosts;
  extensions: Extension[];
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
        // The number suggested; none until the team prepares the release
        // (reading the page asks no kobold).
        next: string | null;
        // Why the number goes up the way it does; none when the kobold could
        // not tell (it suggests the next patch, and the page says so).
        why: string | null;
        // The notes the kobold drafted, by language; none until the team
        // prepares the release, or when it drafted none (the notes then
        // list the pull requests).
        notes: ReleaseNotes | null;
      };
      past: Past[];
    };

export const NO_REPOSITORY =
  "No GitHub repository is connected yet, and releases need one. Connect one in [Settings](#settings), under Where work is tracked.";

export function releasesRoutes(options: Options): Record<string, Route> {
  const factory = join(options.project, FACTORY_FOLDER);
  const judge = new Judge(options.claude, options.project);
  const found = () => releasesFor(options, factory);
  const releasesOf = (): Releases => {
    const one = found();
    if ("problem" in one) throw new Refused(one.problem);
    return one.releases;
  };
  return {
    "GET /api/releases": async (): Promise<ReleasesView> => {
      const one = found();
      if ("problem" in one) return { connected: false, problem: one.problem };
      const { releases } = one;
      const [coming, past] = await Promise.all([
        comingRelease(releases, judge, false),
        releases.past(),
      ]);
      return {
        connected: true,
        repository: one.repository,
        last: coming.last,
        coming: {
          merged: coming.merged.map(({ body: _body, ...one }) => one),
          next: coming.next,
          why: coming.why,
          notes: coming.notes,
        },
        past,
      };
    },
    // Prepare the release: the kobold reads what was merged and suggests
    // the number, now and only now.
    "POST /api/releases/prepare": async () => {
      const coming = await comingRelease(releasesOf(), judge, true);
      if (coming.merged.length === 0)
        throw new Refused(nothingFor(coming.last));
      options.changed("releases");
      return { next: coming.next, why: coming.why, notes: coming.notes };
    },
    // Make it: the notes the kobold drafted (asked now when the factory
    // started again since Prepare), else the pull requests listed.
    "POST /api/releases": async (body) => {
      const releases = releasesOf();
      const wanted = field(body, "number");
      const coming = await comingRelease(releases, judge, false);
      if (coming.merged.length === 0)
        throw new Refused(nothingFor(coming.last));
      const number = checkNumber(wanted, coming.last, coming.tags);
      const judged =
        coming.judged ?? (await judge.judge(coming.last, coming.merged));
      await releases.make(
        number,
        judged?.why ?? null,
        bodyOf(judged?.notes ?? listedNotes(coming.merged), coming.merged),
      );
      options.changed("releases");
      return { number };
    },
  };
}

function nothingFor(last: string | null): string {
  return last
    ? `Nothing was merged since ${last}, so there is nothing to release.`
    : "Nothing was merged yet, so there is nothing to release.";
}

// What the next release would hold, and the number suggested for it: the
// kobold is asked only when `ask` (the team prepares the release);
// otherwise only its answer already given is used, and without one there
// is no suggestion yet.
async function comingRelease(releases: Releases, judge: Judge, ask: boolean) {
  const tags = await releases.tags();
  const last = lastNumber(tags);
  const merged = await releases.merged(last);
  const asked = merged.length > 0 && ask;
  const judged = asked
    ? await judge.judge(last, merged)
    : judge.known(last, merged);
  const prepared = asked || judged !== null;
  return {
    tags,
    last,
    merged,
    next: prepared ? nextNumber(last, judged?.act ?? false) : null,
    why: judged?.why ?? null,
    notes: judged?.notes ?? null,
    judged,
  };
}

// The repository's releases on its code host, or why there are none.
function releasesFor(
  options: Options,
  factory: string,
): { repository: string; releases: Releases } | { problem: string } {
  const board = cardsFor(factory, options.boards);
  if ("problem" in board) return { problem: NO_REPOSITORY };
  const host = codeHostFor(
    factory,
    options.extensions,
    options.hosts,
    board.repository,
  );
  if ("problem" in host) return host;
  return {
    repository: board.repository,
    releases: productReleases(host.releases),
  };
}
