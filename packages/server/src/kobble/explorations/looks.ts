// How a prototype looks once it is made: it is started (beside whatever
// else runs) and photographed on the page the change is on, once for each
// variant, so the kobold who talks with the team sees what was made before
// it says it is ready. When it cannot start or be photographed, the kobold
// is told why instead.

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { addToGitignore } from "@software-factory/core";

import type { PrototypeMode } from "../../prototypes/mode.ts";
import { type Photograph, playwrightPhotograph } from "../usage-pictures.ts";
import { type Made, shownAddress } from "./versions.ts";

const START_WITHIN_MS = 3 * 60_000;

export type Looks = { pictures: string[]; problem: string | null };

export async function lookAt(on: {
  mode: PrototypeMode;
  // The factory's folder: the pictures go with the exploration's files.
  root: string;
  exploration: string;
  made: Made;
  photograph?: Photograph;
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
  const variants =
    (made.variants?.length ?? 0) > 1 ? (made.variants ?? []) : [];
  const shown = variants.length > 0 ? variants.map((one) => one.key) : [""];
  const pictures: string[] = [];
  for (const variant of shown) {
    const name = [made.key, variant].filter(Boolean).join("-");
    const file = join(folder, `${name}.png`);
    try {
      await take(shownAddress(url, { ...made, variant }), file, "1440,900");
      pictures.push(file);
    } catch (error) {
      return {
        pictures,
        problem: `No picture could be taken: ${messageOf(error)}`,
      };
    }
  }
  return { pictures, problem: null };
}

// Started and waited for, without stopping what else runs.
async function running(
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
      throw new Error(`it did not start: ${run.problem ?? "it took too long"}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
