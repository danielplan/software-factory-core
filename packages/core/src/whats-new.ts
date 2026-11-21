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

const HEADING = /^##\s+(\d+\.\d+\.\d+)(?:\s+\((\d{4}-\d{2}-\d{2})\))?$/;
const CHANGE_START = /^[-*]\s+(New|Changed|Fixed):\s+\*\*/;

// "- New: **Title.** Text" as a change, or null when the line is not one.
function changeOf(line: string): WhatsNewChange | null {
  const start = CHANGE_START.exec(line);
  const kind = start?.[1];
  if (!start || !kind) return null;
  const rest = line.slice(start[0].length);
  const end = rest.indexOf("**");
  if (end < 1) return null;
  return {
    kind: kind as WhatsNewKind,
    title: rest.slice(0, end).trim(),
    text: rest.slice(end + 2).trim(),
  };
}

// A file's releases, in the order written; a release with no recognised
// change is left out.
export function parseWhatsNew(text: string): WhatsNewRelease[] {
  const releases: WhatsNewRelease[] = [];
  let open: WhatsNewRelease | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = HEADING.exec(line);
    if (heading?.[1]) {
      open = { version: heading[1], date: heading[2] ?? null, changes: [] };
      releases.push(open);
      continue;
    }
    const change = open ? changeOf(line) : null;
    if (open && change) open.changes.push(change);
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
  const byVersion = new Map<string, WhatsNewRelease>();
  // English first, so a release in the language replaces it.
  for (const code of ["en", language])
    for (const release of parseWhatsNew(files[code] ?? ""))
      byVersion.set(release.version, release);
  return [...byVersion.values()].sort((a, b) =>
    compareVersions(b.version, a.version),
  );
}
