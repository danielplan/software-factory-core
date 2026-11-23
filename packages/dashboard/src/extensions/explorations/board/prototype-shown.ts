// Which prototype the board starts by itself: the agreed one, otherwise the
// newest, while the exploration is open and nothing else runs. One that
// failed waits for Open, and so does every one in a project that does not
// say how to start a prototype (asking would only be refused).

import type { ExplorationPage } from "@/api/client";

const BUSY = new Set(["running", "starting"]);

// Which prototype to start, or null when one already runs or none can.
export function toStart(page: ExplorationPage): string | null {
  if (!page.canRun) return null;
  if (!["waiting", "exploring"].includes(page.exploration.status)) return null;
  if (page.runs.some((run) => run.making || BUSY.has(run.state))) return null;
  const made = page.board.things.flatMap((thing) =>
    thing.kind === "prototype" ? [thing] : [],
  );
  const shown = made.find((thing) => thing.agreed) ?? made.at(-1);
  if (!shown) return null;
  const run = page.runs.find((one) => one.version === shown.key);
  return run?.state === "failed" ? null : shown.key;
}
