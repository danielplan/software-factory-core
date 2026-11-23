// Whether a project has an origin to download from, and the latest of a
// branch: origin's when it has one. A project whose code is not on a code
// host yet (a new one, a demo copy) has none: its copies start from its own
// branches. Asked once per project while the factory runs.

import { run } from "../processes.ts";

const known = new Map<string, Promise<boolean>>();

function hasOrigin(project: string): Promise<boolean> {
  let has = known.get(project);
  if (!has) {
    has = run("git", ["-C", project, "remote", "get-url", "origin"]).then(
      () => true,
      () => false,
    );
    known.set(project, has);
  }
  return has;
}

export async function latestOf(
  project: string,
  branch: string,
): Promise<string> {
  return (await hasOrigin(project)) ? `origin/${branch}` : branch;
}

// Downloads the latest from origin into a copy; nothing to download when
// there is no origin.
export async function fetchOrigin(
  project: string,
  copy: string,
): Promise<void> {
  if (await hasOrigin(project))
    await run("git", ["-C", copy, "fetch", "--quiet", "origin"]);
}
