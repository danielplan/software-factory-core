// How a prototype looks once it is made: it is started (beside whatever
// else runs) and photographed on the page the change is on, once for each
// variant, so the kobold who talks with the team sees what was made before
// it says it is ready. When it cannot start or be photographed, the kobold
// is told why instead.

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { addToGitignore, type Claude } from "@software-factory/core";

import type { PrototypeMode, VersionRun } from "../../prototypes/mode.ts";
import { Refused } from "../../refused.ts";
import {
  type Photograph,
  playwrightPhotograph,
} from "../../kobble/usage-pictures.ts";
import { type Made, opensIn, statesIn, shownAddress } from "./versions.ts";

const START_WITHIN_MS = 3 * 60_000;

export type Looks = {
  pictures: string[];
  problem: string | null;
  // Where it runs, each variant looked at, for the maker's browser.
  addresses?: string[];
};

export async function lookAt(on: {
  mode: PrototypeMode;
  // The factory's folder: the pictures go with the exploration's files.
  root: string;
  exploration: string;
  made: Made;
  photograph?: Photograph;
  // Only this variant; else each.
  only?: string;
}): Promise<Looks> {
  const { mode, exploration, made } = on;
  let url: string;
  try {
    url = await running(mode, exploration, made.key);
  } catch (error) {
    return { pictures: [], problem: messageOf(error) };
  }
  const folder = join(on.root, "kobble", "explorations", exploration, "looks");
  mkdirSync(folder, { recursive: true });
  // Pictures of this computer's run: not kept in git.
  addToGitignore(on.root, "kobble/explorations/*/looks/");
  const take = on.photograph ?? playwrightPhotograph;
  const shown = variantsShown(made, on.only);
  const pictures: string[] = [];
  const addresses = shown.map((variant) =>
    shownAddress(url, { ...made, variant }),
  );
  for (const [n, variant] of shown.entries()) {
    const name = [made.key, variant].filter(Boolean).join("-");
    const file = join(folder, `${name}.png`);
    try {
      await take(addresses[n] ?? url, file, "1440,900");
      pictures.push(file);
    } catch (error) {
      return {
        pictures,
        problem: `No picture could be taken: ${messageOf(error)}`,
      };
    }
  }
  return { pictures, problem: null, addresses };
}

// The variants looked at: the one asked for, else each; "" when the
// prototype has no variants to switch between.
function variantsShown(made: Made, only?: string): string[] {
  const variants =
    (made.variants?.length ?? 0) > 1 ? (made.variants ?? []) : [];
  if (variants.length === 0) return [""];
  return only ? [only] : variants.map((one) => one.key);
}

// Started and waited for, without stopping what else runs; where it runs.
export async function running(
  mode: PrototypeMode,
  exploration: string,
  key: string,
): Promise<string> {
  await mode.start(exploration, key);
  const until = Date.now() + START_WITHIN_MS;
  for (;;) {
    const run = mode.runOf(exploration, key);
    if (run.state === "running" && run.url) return run.url;
    if (run.state === "failed" || Date.now() > until)
      throw new Error(run.problem ?? "it took too long");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

type Result = Awaited<ReturnType<Claude["run"]>>;

// The maker looks at what it made before it is called ready: the page the
// change is on is kept, the prototype photographed, and the maker, in the
// same conversation, shown the pictures to fix what does not show what was
// asked. What it said last counts; when it could not look, it is told why
// and goes on as it was.
export async function lookAndFix(
  made: Result,
  on: {
    ask: (prompt: string) => Promise<Result>;
    look: () => Promise<Looks>;
    opens: (page: string) => void;
    // The states it said each variant can be shown in.
    states?: (states: string[]) => void;
    // It looked by itself with its tool: then it is not made to again.
    looked?: () => boolean;
  },
): Promise<Result> {
  if (!made.ok) return made;
  heard(made.text, on);
  if (on.looked?.()) return made;
  const { pictures, problem } = await on.look();
  if (pictures.length === 0) return made;
  const fixed = await on.ask(lookWords(pictures, problem));
  if (!fixed.ok) return made;
  heard(fixed.text, on);
  return fixed;
}

// The page and the states the maker's last words name.
function heard(
  said: string,
  on: { opens: (page: string) => void; states?: (states: string[]) => void },
): void {
  const page = opensIn(said);
  if (page) on.opens(page);
  const states = statesIn(said);
  if (states) on.states?.(states);
}

function lookWords(pictures: string[], problem: string | null): string {
  return [
    "Here is what you made, running, on the page it opens on (one picture per variant):",
    ...pictures.map((file) => `- ${file}`),
    problem ? `Not every picture could be taken: ${problem}` : "",
    "Read each picture. Does it show what was asked, with the made-up data the change needs to be seen, on the right page? Fix what does not, in this copy. Then end again with your last words (what you changed, where to look, every library you added or piece you copied) and the Opens at line.",
  ]
    .filter(Boolean)
    .join("\n");
}

// A prototype is changed once the maker is done with it.
export function notWhileMade(run: VersionRun): void {
  if (run.making)
    throw new Refused(
      `Prototype ${run.version} is still being made: change it once it is ready.`,
    );
}

// What each prototype being made does now, for the kobold who talks with
// the team.
export function beingMadeIn(runs: VersionRun[]): string[] {
  return runs
    .filter((run) => run.making)
    .map((run) => {
      const doing = run.activity ? ` (${run.activity})` : "";
      return `${run.version}: being made${doing}`;
    });
}
