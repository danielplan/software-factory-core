// Where a started prototype runs, for a persona test: its address once it
// answers, on the page it opens on; refused, saying why, when it does not
// start.

import type { PrototypeMode } from "../../prototypes/mode.ts";
import { Refused } from "../../refused.ts";
import { running } from "./looks.ts";
import { shownAddress, type Made } from "./versions.ts";

export async function addressOf(
  mode: PrototypeMode,
  exploration: string,
  key: string,
  made: Made | null,
): Promise<string> {
  const url = await running(mode, exploration, key).catch((error: unknown) => {
    throw new Refused(
      `Prototype ${key} did not start: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
  return shownAddress(url, made);
}
