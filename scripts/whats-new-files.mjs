// The plain-words files of a release (WHATS-NEW.md, WHATS-NEW.it.md,
// WHATS-NEW.de.md at the repository's root), shared by the build and the
// publish step.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  hasWhatsNewFor,
  WHATS_NEW_LANGUAGES,
  whatsNewFile,
} from "../packages/core/src/whats-new.ts";

// The files a release has to ship: one per language.
export const whatsNewFiles = WHATS_NEW_LANGUAGES.map(whatsNewFile);

// The problems that stop a release: a file missing, or without a section
// for the version. Empty when it is ready.
export function whatsNewProblems(root, version) {
  return whatsNewFiles.flatMap((file) => {
    const path = join(root, file);
    if (!existsSync(path)) return [`${file} is missing.`];
    return hasWhatsNewFor(readFileSync(path, "utf8"), version)
      ? []
      : [`${file} has no section "## ${version}" with changes.`];
  });
}
