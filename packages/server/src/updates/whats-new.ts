// What's new in Kobble: the plain words of each release (core's
// whats-new.ts), read from the Kobble on this computer, so they work
// offline, and, for a newer release, from GitHub at its tag, when it can be
// reached. Reaching GitHub never holds the local list back.

import {
  RELEASE_SOURCE,
  type WhatsNewRelease,
  WHATS_NEW_LANGUAGES,
  whatsNewFile,
  whatsNewIn,
} from "@software-factory/core";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

// A language's files, by language code; a language with no file is not in it.
export type WhatsNewFiles = Partial<Record<string, string>>;

export type WhatsNewView = {
  // The Kobble this factory runs.
  current: string;
  // The newer release, when one is out, with its changes when GitHub gave
  // them; its release is null when they could not be read.
  newest: { version: string; release: WhatsNewRelease | null } | null;
  // GitHub could not be reached the last time it was asked.
  offline: boolean;
  // When it was last asked (ISO time), or null.
  checkedAt: string | null;
  // The releases this computer has words for, newest first.
  releases: WhatsNewRelease[];
  // The local files could not be read.
  problem: boolean;
};

// The files of the Kobble this server belongs to: in an installed package
// they are in its root (next to README.md), in this repository at the
// repository's root; found by walking up from where the server is.
export function localWhatsNew(from: string): WhatsNewFiles {
  let folder = from;
  for (;;) {
    if (existsSync(join(folder, whatsNewFile("en")))) {
      const files: WhatsNewFiles = {};
      for (const language of WHATS_NEW_LANGUAGES) {
        const path = join(folder, whatsNewFile(language));
        if (existsSync(path)) files[language] = readFileSync(path, "utf8");
      }
      return files;
    }
    const up = dirname(folder);
    if (up === folder) return {};
    folder = up;
  }
}

// The files of a release on GitHub, at its tag; null when they cannot be
// read. A language whose file is not there is left out.
export async function remoteWhatsNew(
  version: string,
): Promise<WhatsNewFiles | null> {
  const repository = RELEASE_SOURCE.replace(/^github:/, "");
  const files: WhatsNewFiles = {};
  try {
    for (const language of WHATS_NEW_LANGUAGES) {
      const response = await fetch(
        `https://raw.githubusercontent.com/${repository}/release-${version}/${whatsNewFile(language)}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (response.ok) files[language] = await response.text();
      else if (response.status !== 404) return null;
    }
  } catch {
    return null;
  }
  return files;
}

export type WhatsNewOptions = {
  current: string;
  local: () => WhatsNewFiles;
  files: (version: string) => Promise<WhatsNewFiles | null>;
};

export class WhatsNew {
  // A newer release's files, kept per version once read.
  private readonly kept = new Map<string, WhatsNewFiles>();
  private readonly options: WhatsNewOptions;

  constructor(options: WhatsNewOptions) {
    this.options = options;
  }

  async view(
    language: string,
    release: {
      newest: string | null;
      offline: boolean;
      checkedAt: string | null;
    },
  ): Promise<WhatsNewView> {
    const { current } = this.options;
    let problem = false;
    let releases: WhatsNewRelease[] = [];
    try {
      releases = whatsNewIn(this.options.local(), language);
    } catch {
      problem = true;
    }
    let newest: WhatsNewView["newest"] = null;
    if (release.newest) {
      const version = release.newest;
      let files = this.kept.get(version) ?? null;
      if (!files && !release.offline) {
        files = await this.options.files(version);
        if (files) this.kept.set(version, files);
      }
      newest = {
        version,
        release:
          (files &&
            whatsNewIn(files, language).find(
              (one) => one.version === version,
            )) ||
          null,
      };
    }
    return {
      current,
      newest,
      offline: release.offline,
      checkedAt: release.checkedAt,
      releases: releases.filter((one) => one.version !== newest?.version),
      problem,
    };
  }
}
