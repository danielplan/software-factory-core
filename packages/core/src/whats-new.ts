// What each Kobble release changed for the team, in plain words: one file
// per language (WHATS-NEW.md, WHATS-NEW.it.md, WHATS-NEW.de.md) that Kobble's
// makers write at each release. `## 0.13.2` (or `## 0.13.2 (2026-11-21)`)
// starts a release; each `- New: **Title.** One or two sentences.` line is
// one change, tagged New, Changed or Fixed. Lines that are none of these
// are left out.

import { compareVersions } from "./version.ts";

export type WhatsNewKind = "New" | "Changed" | "Fixed";

export type WhatsNewChange = {
  kind: WhatsNewKind;
  // Markdown, as written: the bold part of the line, without its stars.
  title: string;
  // Markdown, as written: what follows the title (may be empty).
  text: string;
};

export type WhatsNewRelease = {
  version: string;
  // The date from `## 0.13.2 (2026-11-21)`, when there is one.
  date: string | null;
  changes: WhatsNewChange[];
};

export const WHATS_NEW_LANGUAGES = ["en", "it", "de"] as const;

// The file of a language: English has none in its name.
export function whatsNewFile(language: string): string {
  return language === "en" ? "WHATS-NEW.md" : `WHATS-NEW.${language}.md`;
}

const HEADING = /^##\s+(\d+\.\d+\.\d+)(?:\s+\((\d{4}-\d{2}-\d{2})\))?\s*$/;
const CHANGE = /^[-*]\s+(New|Changed|Fixed):\s+\*\*(.+?)\*\*\s*(.*)$/;

// A file's releases, in the order written; a release with no recognised
// change is left out.
export function parseWhatsNew(text: string): WhatsNewRelease[] {
  const releases: WhatsNewRelease[] = [];
  let open: WhatsNewRelease | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = HEADING.exec(line);
    if (heading) {
      open = { version: heading[1]!, date: heading[2] ?? null, changes: [] };
      releases.push(open);
      continue;
    }
    const change = CHANGE.exec(line);
    if (change && open)
      open.changes.push({
        kind: change[1] as WhatsNewKind,
        title: change[2]!.trim(),
        text: change[3]!.trim(),
      });
  }
  return releases.filter((release) => release.changes.length > 0);
}

export function hasWhatsNewFor(text: string, version: string): boolean {
  return parseWhatsNew(text).some((release) => release.version === version);
}

// The releases of the languages put together for one language, newest
// first: each release in that language, else in English; a release no file
// has is not there.
export function whatsNewIn(
  files: Partial<Record<string, string>>,
  language: string,
): WhatsNewRelease[] {
  const read = (code: string) => parseWhatsNew(files[code] ?? "");
  const own = read(language);
  const english = read("en");
  const versions = new Set([...own, ...english].map((one) => one.version));
  return [...versions]
    .sort((a, b) => compareVersions(b, a))
    .map(
      (version) =>
        own.find((one) => one.version === version) ??
        english.find((one) => one.version === version)!,
    );
}
