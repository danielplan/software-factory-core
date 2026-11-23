import type { KeptRelease } from "../packages/core/src/release-notes.ts";

type Listed = {
  tag_name: string;
  body: string | null;
  published_at: string | null;
  draft: boolean;
};

export const KOBBLE_REPOSITORY: string;
export function keptNotes(root: string): KeptRelease[];
export function githubReleases(repository?: string): Listed[];
export function publishedNotes(listed: Listed[]): KeptRelease[];
export function packageNotes(
  kept: KeptRelease[],
  published: KeptRelease[],
): { releases: KeptRelease[] };
export function notesProblems(
  releases: KeptRelease[],
  version: string,
): string[];
