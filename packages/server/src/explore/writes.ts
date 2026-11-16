// What a person does on Explore and in prototype mode: a new idea started
// from a story, a pick (one per person per idea; pressing it again takes it
// back), a version shared with the team, and an idea thrown away before
// anything came of it. The store checks every write against the records'
// rules.

import {
  type Idea,
  RecordsRefused,
  type RecordStore,
  versionKey,
} from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { Edit, newId } from "../records/edit.ts";

const words = z.string().trim().min(1);

export const fromStorySchema = z.strictObject({
  story: words,
  title: words,
  weThink: z.string().trim().optional(),
});

export const versionAsked = z.strictObject({ idea: words, version: words });

// A new idea for the problem a story breaks at, for its persona.
export function ideaFromStory(
  store: RecordStore,
  asked: z.infer<typeof fromStorySchema>,
): Idea {
  const edit = new Edit(store);
  const story = edit.get("stories", asked.story, "story");
  const problem = story.problem
    ? edit.get("problems", story.problem, "problem")
    : null;
  if (story.wrong !== null || !problem)
    throw new Refused(`The story “${story.title}” breaks at no problem.`);
  const persona = edit.get("personas", story.persona, "persona");
  const idea = edit.put("ideas", {
    id: newId("idea"),
    title: asked.title,
    weThink:
      asked.weThink || `It would help ${persona.name} with “${problem.title}”.`,
    origin: { from: "problem", id: problem.id },
    problems: [problem.id],
    persona: persona.id,
  });
  edit.save(store);
  return idea;
}

// The person's pick on a version of an idea: theirs alone among its
// versions, or taken back when it was theirs already. What it is now, in a
// line.
export function togglePick(
  store: RecordStore,
  idea: string,
  version: string,
  who: string,
): string {
  const versions = store.list("versions").filter((v) => v.idea === idea);
  const picked = versions.find((v) => v.key === version);
  if (!picked)
    throw new Refused(`There is no version ${version} of “${idea}”.`);
  const taking = !picked.picks.includes(who);
  write(store, (writer) => {
    for (const v of versions) {
      const others = v.picks.filter((name) => name !== who);
      const picks = v === picked && taking ? [...others, who] : others;
      if (picks.length !== v.picks.length)
        writer.put("versions", { ...v, picks });
    }
  });
  return taking ? `${who} picked ${version}.` : `${who} took the pick back.`;
}

// The version shared with the team: it shows on Explore, to try and pick.
export function shareVersion(
  store: RecordStore,
  idea: string,
  version: string,
): string {
  const found = store.get("versions", versionKey(idea, version));
  if (!found) throw new Refused(`There is no version ${version} of “${idea}”.`);
  if (found.sharedAt === null)
    write(store, (writer) => {
      writer.put("versions", {
        ...found,
        sharedAt: new Date().toISOString().slice(0, 10),
      });
    });
  return `Version ${version} is shared: it shows on Explore.`;
}

// An idea thrown away before anything came of it (no version, no ticket),
// with the story it assumed and that story's assumed problem.
export function discardIdea(store: RecordStore, id: string): void {
  const edit = new Edit(store);
  const idea = edit.get("ideas", id, "idea");
  const { records } = edit;
  if (
    records.versions.some((v) => v.idea === id) ||
    records.ticketLinks.some((t) => "idea" in t.from && t.from.idea === id)
  )
    throw new Refused(
      `“${idea.title}” has versions already: it stays, to keep what was tried.`,
    );
  edit.remove("ideas", id);
  const stories = records.stories.filter(
    (s) => "idea" in s.from && s.from.idea === id,
  );
  for (const story of stories) {
    edit.remove("stories", story.id);
    const problem = edit.find("problems", story.problem ?? "");
    if (problem?.assumed) edit.remove("problems", problem.id);
  }
  edit.save(store);
}

function write(
  store: RecordStore,
  changes: Parameters<RecordStore["write"]>[0],
) {
  try {
    store.write(changes);
  } catch (error) {
    if (error instanceof RecordsRefused) throw new Refused(error.message);
    throw error;
  }
}
