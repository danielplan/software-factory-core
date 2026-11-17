// The signal files stay on the computer that read the live app: they are
// what people said, and git would keep them for ever. The factory's
// .gitignore names their folder.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const IGNORED_SIGNALS = "kobble/signals/";

// Adds the line to the factory's .gitignore when it is missing; true when
// it had to.
export function ignoreSignals(factory: string): boolean {
  const file = join(factory, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (text.split(/\r?\n/).some((line) => line.trim() === IGNORED_SIGNALS))
    return false;
  const before = text === "" || text.endsWith("\n") ? text : `${text}\n`;
  writeFileSync(file, `${before}${IGNORED_SIGNALS}\n`);
  return true;
}
