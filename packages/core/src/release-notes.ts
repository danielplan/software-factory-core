// The notes of a release, as they live on the code host's release (GitHub
// releases): written in English, with the same notes in Italian and German
// folded into the same text, so one release holds every language. Each
// change is one line, `- New: **Title.** One or two sentences.`, tagged
// New, Changed or Fixed; the tag stays in English in every language, so a
// page can read it back. English comes first; each other language follows
// in a section of its own that folds open on GitHub:
//
//   - New: **Title.** Text.
//
//   <details lang="it">
//   <summary>Italiano</summary>
//
//   - New: **Titolo.** Testo.
//
//   </details>
//
// A product's package keeps a copy of its releases' notes (the offline
// copy, `release-notes.json`), so its notes show without the code host.

import { z } from "zod";

import { type Language, LANGUAGES } from "./agents/language-settings.ts";
import { compareVersions } from "./version.ts";

export const RELEASE_CHANGE_KINDS = ["New", "Changed", "Fixed"] as const;

export const releaseChangeSchema = z.object({
  kind: z.enum(RELEASE_CHANGE_KINDS),
  // Markdown: the bold part of the line, without its stars.
  title: z.string().trim().min(1),
  // Markdown: what follows the title (may be empty).
  text: z.string().trim(),
});

export type ReleaseChange = z.infer<typeof releaseChangeSchema>;

const changesSchema = z.array(releaseChangeSchema);

// A release's notes, by language: English always, the others when they
// were made.
export const releaseNotesSchema = z.object({
  en: changesSchema,
  it: changesSchema.optional(),
  de: changesSchema.optional(),
}) satisfies z.ZodType<Partial<Record<Language, ReleaseChange[]>>>;

export type ReleaseNotes = z.infer<typeof releaseNotesSchema>;

// The languages after English, as their sections are headed.
const OTHERS: Record<Exclude<Language, "en">, string> = {
  it: "Italiano",
  de: "Deutsch",
};

// "- New: **Title.** Text"
export function changeLine(change: ReleaseChange): string {
  const text = change.text ? ` ${change.text}` : "";
  return `- ${change.kind}: **${change.title}**${text}`;
}

const CHANGE_START = /^[-*]\s+(New|Changed|Fixed):\s+\*\*/;

function changeOf(line: string): ReleaseChange | null {
  const start = CHANGE_START.exec(line);
  const kind = start?.[1] as ReleaseChange["kind"] | undefined;
  if (!start || !kind) return null;
  const rest = line.slice(start[0].length);
  const end = rest.indexOf("**");
  if (end < 1) return null;
  return {
    kind,
    title: rest.slice(0, end).trim(),
    text: rest.slice(end + 2).trim(),
  };
}

// The change lines of a text, in the order written; other lines are left
// out.
export function changesOf(markdown: string): ReleaseChange[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => changeOf(line.trim()))
    .filter((change) => change !== null);
}

// A release's text: the English notes (and, after them, what is said only
// once, such as the pull requests merged), then a section per other
// language that has notes.
export function releaseBody(notes: ReleaseNotes, after = ""): string {
  const english = [notes.en.map(changeLine).join("\n"), after.trim()]
    .filter(Boolean)
    .join("\n\n");
  const others = Object.entries(OTHERS).flatMap(([language, name]) => {
    const changes = notes[language as keyof typeof OTHERS];
    return changes && changes.length > 0
      ? [
          [
            `<details lang="${language}">`,
            `<summary>${name}</summary>`,
            "",
            changes.map(changeLine).join("\n"),
            "",
            "</details>",
          ].join("\n"),
        ]
      : [];
  });
  return `${[english, ...others].filter(Boolean).join("\n\n")}\n`;
}

const SECTION =
  /<details lang="([a-z]{2})">\s*<summary>[^<]*<\/summary>([\s\S]*?)<\/details>/g;

const isLanguage = (code: string): code is Language =>
  LANGUAGES.some((one) => one === code);

// A release's text by language: English is everything outside the
// languages' sections. A text written some other way is all English.
export function bodySections(body: string): Partial<Record<Language, string>> {
  const sections: Partial<Record<Language, string>> = {};
  for (const [, language, text] of body.matchAll(SECTION))
    if (language && isLanguage(language) && language !== "en")
      sections[language] = (text ?? "").trim();
  return { ...sections, en: body.replace(SECTION, "").trim() };
}

// A release's notes read back from its text.
export function notesOfBody(body: string): ReleaseNotes {
  const sections = bodySections(body);
  const notes: ReleaseNotes = { en: changesOf(sections.en ?? "") };
  if (sections.it !== undefined) notes.it = changesOf(sections.it);
  if (sections.de !== undefined) notes.de = changesOf(sections.de);
  return notes;
}

// The notes in a language, else in English.
export function notesIn(
  notes: ReleaseNotes,
  language: string,
): ReleaseChange[] {
  const own = isLanguage(language) ? notes[language] : undefined;
  return own && own.length > 0 ? own : notes.en;
}

// "v0.15.0" → "0.15.0"; null for a tag of another shape.
export function versionOfTag(tag: string): string | null {
  return /^v(\d+\.\d+\.\d+)$/.exec(tag)?.[1] ?? null;
}

// The offline copy: the file in a product's package with its releases'
// notes, newest first.
export const RELEASE_NOTES_FILE = "release-notes.json";

export const keptReleaseSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  // The day it was made (YYYY-MM-DD), when known.
  date: z.string().nullable(),
  notes: releaseNotesSchema,
});

export type KeptRelease = z.infer<typeof keptReleaseSchema>;

export const releaseNotesFileSchema = z.object({
  releases: z.array(keptReleaseSchema),
});

// Two lists of releases as one, newest first: a release in the second
// replaces the same version in the first.
export function joinReleases(
  first: KeptRelease[],
  second: KeptRelease[],
): KeptRelease[] {
  const byVersion = new Map<string, KeptRelease>();
  for (const release of [...first, ...second])
    byVersion.set(release.version, release);
  return [...byVersion.values()].sort((a, b) =>
    compareVersions(b.version, a.version),
  );
}
