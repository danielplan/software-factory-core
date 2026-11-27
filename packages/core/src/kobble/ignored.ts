// The signal files stay on the computer that read the live app: they are
// what people said, and git would keep them for ever. The factory's
// .gitignore names their folder. Beside them, in the same ignored folder,
// is where this computer last read the live app (store.ts), so a teammate
// starts reading from the beginning and gets the signals too.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const IGNORED_SIGNALS = "kobble/signals/";
// The pictures a test takes of the app on this computer.
export const IGNORED_TEST_SHOTS = "kobble/test-shots/";

// Adds the line to the factory's .gitignore when it is missing; true when
// it had to.
export function ignoreSignals(factory: string): boolean {
  return addToGitignore(factory, IGNORED_SIGNALS);
}

// Adds a line to the factory's .gitignore when it is missing; true when it
// had to.
export function addToGitignore(factory: string, line: string): boolean {
  const file = join(factory, ".gitignore");
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  if (text.split(/\r?\n/).some((one) => one.trim() === line)) return false;
  const before = text === "" || text.endsWith("\n") ? text : `${text}\n`;
  writeFileSync(file, `${before}${line}\n`);
  return true;
}
