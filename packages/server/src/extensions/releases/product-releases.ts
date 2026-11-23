// A product's releases, through the code host (the `code` slot): the
// vX.Y.Z tags there are, the past releases with their notes in each
// language, the pull requests merged into the main branch since a tag,
// and making a release (a tag on the main branch's latest commit and a
// release on it). Nothing is kept in the factory's files.

import { bodySections, type Language } from "@software-factory/core";

import { typeOf } from "../../cards/cards.ts";
import type { CodeReleases } from "../../code-host.ts";
import type { Merged } from "./notes.ts";
import { numberOfTag, tagOf } from "./numbers.ts";

// The why of a release made here, kept in its notes where a page can read
// it back (a comment, so the code host does not show it).
const WHY = /^<!-- software-factory:why (".*") -->\n?/;

export type Past = {
  number: string;
  date: string;
  url: string;
  // The line saying why the number is the one it is, when it was made here.
  why: string | null;
  // Its notes (Markdown) by language: English always, the others when the
  // release has them.
  notes: Partial<Record<Language, string>>;
};

export type Releases = {
  tags: () => Promise<string[]>;
  past: () => Promise<Past[]>;
  // Merged into the main branch after this release (all of them without).
  merged: (since: string | null) => Promise<Merged[]>;
  make: (number: string, why: string | null, body: string) => Promise<void>;
};

export function productReleases(host: CodeReleases): Releases {
  return {
    tags: () => host.tags("v"),
    past: async () => pastOf(await host.list()),
    merged: async (since) =>
      (await host.mergedSince(since ? tagOf(since) : null)).map((one) => ({
        number: one.number,
        title: one.title,
        url: one.url,
        body: one.body,
        // The first type label: the pull request's own before its card's.
        type:
          one.labels
            .map((label) => typeOf([label]))
            .find((type) => type !== null) ?? null,
      })),
    make: (number, why, body) =>
      host.create({
        tag: tagOf(number),
        title: number,
        body:
          (why ? `<!-- software-factory:why ${whyJson(why)} -->\n` : "") + body,
      }),
  };
}

// JSON that can sit inside an HTML comment.
const whyJson = (why: string) =>
  JSON.stringify(why).replaceAll(">", "\\u003e").replaceAll("<", "\\u003c");

// The published releases with a vX.Y.Z tag, newest first.
function pastOf(listed: Awaited<ReturnType<CodeReleases["list"]>>): Past[] {
  return listed.flatMap((release) => {
    const number = numberOfTag(release.tag);
    if (number === null || release.draft) return [];
    const marker = WHY.exec(release.body);
    return [
      {
        number,
        date: release.date,
        url: release.url,
        why: marker ? (JSON.parse(marker[1] ?? '""') as string) : null,
        notes: bodySections(release.body.replace(WHY, "")),
      },
    ];
  });
}
