// What a project's git history says about it, for the setup coach: how
// old it is, how busy, who made it, its versions and its latest changes.
// Code does not say whether a project is a weekend try or in daily use; its
// history often does. Only reads.

import { execFileSync } from "node:child_process";

import { GIT } from "../git.ts";

export function historyOf(folder: string): string {
  const git = (...args: string[]) =>
    execFileSync(GIT, ["-C", folder, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  let commits: string;
  try {
    commits = git("rev-list", "--count", "HEAD");
  } catch {
    return `No git history in ${folder}: nothing to learn from it.`;
  }
  const first = git("log", "--max-parents=0", "--format=%ad", "--date=short")
    .split("\n")
    .at(-1);
  const last = git("log", "-1", "--format=%ad", "--date=short");
  const months = countBy(
    git("log", "--format=%ad", "--date=format:%Y-%m").split("\n"),
  );
  const people = git("shortlog", "-sn", "HEAD");
  const versions = git("tag", "--sort=-creatordate").split("\n").slice(0, 10);
  const latest = git("log", "-30", "--format=%ad %s", "--date=short");
  return [
    `${commits} changes, from ${first ?? "?"} to ${last}.`,
    `Changes per month: ${months}.`,
    `Who made them:\n${people}`,
    `Versions (newest first): ${versions.filter(Boolean).join(", ") || "none"}.`,
    `The latest changes:\n${latest}`,
  ].join("\n\n");
}

// "2026-09 12, 2026-10 40", oldest first.
function countBy(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values.toReversed())
    counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([key, n]) => `${key} ${String(n)}`).join(", ");
}
