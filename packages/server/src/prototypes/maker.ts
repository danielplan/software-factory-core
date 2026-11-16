// "Make another version": the kobold makes a new version of an idea in
// prototype mode, like the builder builds a card: in the version's own copy
// of the code (copies.ts), on its own branch `factory/<idea>/<key>`, with
// the explore skill as its method. It may change files only in that copy,
// never pushes, and what it leaves is committed on that branch alone. The
// version is in the records from the start, not shared yet: nobody sees it
// in Explore until a person shares it.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  type Claude,
  KOBOLD,
  type Records,
  type Version,
} from "@software-factory/core";
import { skillsFolder } from "@software-factory/skills";

import { Refused } from "../refused.ts";
import { versionBranch, versionCopy, versionWorkspace } from "./copies.ts";
import type { PrototypeMode } from "./mode.ts";

const TIME_LIMIT_MS = 60 * 60_000;
// A to Z.
const KEYS = Array.from({ length: 26 }, (_, at) =>
  String.fromCharCode(65 + at),
);

// The next free letter of an idea's versions: A, B, …, then V27, V28.
export function nextKey(taken: string[]): string {
  const free = KEYS.find((letter) => !taken.includes(letter));
  if (free) return free;
  let n = KEYS.length + 1;
  while (taken.includes(`V${String(n)}`)) n++;
  return `V${String(n)}`;
}

// A new version, made by the kobold from what the person asked; it is in
// the records at once, and made in the background.
export function makeVersion(
  mode: PrototypeMode,
  claude: Claude,
  idea: string,
  asked: string,
): Version {
  const text = asked.trim();
  if (!text) throw new Refused("Say what the version should do.");
  const store = mode.options.records();
  if (!store.get("ideas", idea))
    throw new Refused(`There is no idea “${idea}”.`);
  const others = store.list("versions").filter((v) => v.idea === idea);
  const key = nextKey(others.map((v) => v.key));
  const version = store.put("versions", {
    idea,
    key,
    name: shortName(text),
    branch: versionBranch(idea, key),
    madeBy: [KOBOLD],
    surface: others[0]?.surface ?? "desktop",
    sharedAt: null,
    picks: [],
  });
  mode.set(idea, key, { state: "making", activity: "Starting", problem: null });
  void making(mode, claude, version, text).catch((error: unknown) => {
    const problem = error instanceof Error ? error.message : String(error);
    mode.set(idea, key, { state: "failed", activity: null, problem });
  });
  return version;
}

async function making(
  mode: PrototypeMode,
  claude: Claude,
  version: Version,
  text: string,
): Promise<void> {
  const { idea, key } = version;
  const copy = versionCopy(mode.options.project, idea, key, version.branch);
  const workspace = await versionWorkspace(mode.options.project, copy);
  const result = await claude.run({
    cwd: copy.folder,
    prompt: makePrompt(mode.options.records().all(), version, text),
    readOnly: false,
    deny: ["Read(**/.env*)"],
    instructions: readFileSync(
      join(skillsFolder, "explore", "SKILL.md"),
      "utf8",
    ),
    session: { id: randomUUID(), resume: false },
    timeLimitMs: TIME_LIMIT_MS,
    onActivity: (line) => {
      mode.set(idea, key, { activity: line.slice(0, 80) });
    },
  });
  await workspace.commitAll(`Version ${key} of the idea ${idea}: ${text}`);
  if (result.ok)
    mode.set(idea, key, { state: "stopped", activity: null, problem: null });
  else
    mode.set(idea, key, {
      state: "failed",
      activity: null,
      problem: `The kobold stopped: ${result.error ?? "Claude Code stopped"}. What it did so far is on ${version.branch}.`,
    });
}

// What the kobold is told: the idea, the persona and the story it is for,
// and what this version should do.
export function makePrompt(
  records: Records,
  version: Version,
  text: string,
): string {
  const idea = records.ideas.find((i) => i.id === version.idea);
  const stories = records.stories.filter(
    (s) =>
      (idea?.problems ?? []).includes(s.problem ?? "") ||
      ("idea" in s.from && s.from.idea === version.idea),
  );
  return [
    `Make version ${version.key} of the idea “${idea?.title ?? version.idea}”, as the explore skill says, in this copy of the code (on the branch ${version.branch}).`,
    `We think: ${idea?.weThink ?? ""}`,
    "",
    `This version: ${text}`,
    "",
    ...stories.flatMap((story) => [
      `The story it is for: “${story.title}” (${story.persona}). Starts: ${story.starts || "not said"}. Wants: ${story.wants || "not said"}.`,
      ...story.scenes.map((s, at) => {
        const breaks = s.breaks ? " (it breaks here)" : "";
        return `${String(at + 1)}. ${s.text}${breaks}`;
      }),
    ]),
  ].join("\n");
}

// The version's name: what was asked, in a few words.
export function shortName(text: string): string {
  const words = text.split(/\s+/).filter(Boolean);
  const first = words.slice(0, 6).join(" ");
  const name = words.length > 6 ? `${first}…` : first;
  return name.charAt(0).toUpperCase() + name.slice(1);
}
