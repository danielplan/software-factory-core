// Where a signal goes when it is sorted (by the kobold) or moved (by a
// person): evidence in a scene of a story (a guessed scene becomes seen), a
// new story the kobold writes from it, Build (a bug or an update), answered
// (a plain question), or nowhere yet. Taking it out of where it was comes
// first: a story the kobold started from this signal alone goes with it,
// and so does that story's problem when nothing else needs it.

import { KOBOLD, type Signal, type Story } from "@software-factory/core";
import { z } from "zod";

import { Refused } from "../refused.ts";
import { type Edit, newId } from "./edit.ts";

const words = z.string().trim().min(1);

const newScene = z.strictObject({
  text: words.describe("The moment, in a short line."),
  where: z
    .string()
    .optional()
    .describe('Where it happens, a free label ("Pay", "Checkout").'),
  shows: z
    .boolean()
    .describe("True for the scene this signal shows: only that one is seen."),
  breaks: z.boolean().describe("True for the one scene where it breaks."),
});

export const newStorySchema = z.strictObject({
  title: words,
  starts: z.string().describe("Where and when it starts."),
  wants: z.string().describe("What the persona wants in it."),
  scenes: z.array(newScene).min(1),
  instead: z
    .string()
    .optional()
    .describe("What the persona does instead, since it breaks."),
  problem: z
    .union([
      z.strictObject({ id: words.describe("An existing problem's id.") }),
      z.strictObject({
        title: words.describe("A new problem, in the persona's terms."),
        reading: z.string().describe("What is behind it, in a line or two."),
      }),
    ])
    .describe("The one problem it breaks at: an existing one, or a new one."),
});

export const placeSchema = z.discriminatedUnion("to", [
  z.strictObject({
    to: z.literal("scene"),
    story: words,
    scene: z.number().int().min(1).describe("The scene's number, from 1."),
  }),
  z.strictObject({ to: z.literal("newStory"), story: newStorySchema }),
  z.strictObject({ to: z.literal("build") }),
  z.strictObject({ to: z.literal("answered") }),
  z.strictObject({ to: z.literal("unsure") }),
]);

export type Place = z.infer<typeof placeSchema>;
type NewStory = z.infer<typeof newStorySchema>;

// The signal, out of where it was, then in its new place; what was done,
// in a line.
export function place(edit: Edit, signal: Signal, where: Place, by: string) {
  takeOut(edit, signal);
  if (where.to === "scene") return toScene(edit, signal, where);
  if (where.to === "newStory") return toNewStory(edit, signal, where.story, by);
  signal.wentTo = where.to === "unsure" ? null : { to: where.to };
  edit.put("signals", signal);
  if (where.to === "build") return "It goes to Build.";
  return where.to === "answered" ? "It is answered." : "It is not sorted.";
}

function toScene(
  edit: Edit,
  signal: Signal,
  { story: id, scene: number }: { story: string; scene: number },
): string {
  const story = edit.get("stories", id, "story");
  if (story.wrong !== null)
    throw new Refused(`The story “${story.title}” turned out wrong.`);
  const scene = story.scenes[number - 1];
  if (!scene)
    throw new Refused(
      `The story “${story.title}” has ${String(story.scenes.length)} scenes.`,
    );
  const guessed = scene.evidence.length === 0;
  scene.evidence = [...scene.evidence, signal.id];
  edit.put("stories", story);
  edit.put("signals", {
    ...signal,
    soundsLike: story.persona,
    wentTo: { to: "story", id: story.id },
  });
  return `It is evidence in scene ${String(number)} of “${story.title}”${guessed ? ", which is seen now" : ""}.`;
}

function toNewStory(
  edit: Edit,
  signal: Signal,
  told: NewStory,
  by: string,
): string {
  const persona = signal.soundsLike;
  if (persona === null)
    throw new Refused("Say which persona it sounds like first.");
  if (!told.scenes.some((scene) => scene.shows))
    throw new Refused("Say which scene the signal shows.");
  const problem =
    "id" in told.problem
      ? edit.get("problems", told.problem.id, "problem").id
      : edit.put("problems", {
          id: newId("problem"),
          persona,
          title: told.problem.title,
          reading: told.problem.reading,
          by,
          assumed: false,
          realProblem: null,
        }).id;
  const story = edit.put("stories", {
    id: newId("story"),
    persona,
    title: told.title,
    starts: told.starts,
    wants: told.wants,
    scenes: told.scenes.map((scene) => ({
      text: scene.text,
      where: scene.where?.trim() ? scene.where.trim() : null,
      evidence: scene.shows ? [signal.id] : [],
      breaks: scene.breaks,
    })),
    instead: told.instead?.trim() ? { text: told.instead, evidence: [] } : null,
    wrong: null,
    isNew: true,
    from: { signals: [signal.id] },
    problem,
  });
  edit.put("signals", { ...signal, wentTo: { to: "story", id: story.id } });
  return `It starts a new story: “${story.title}”.`;
}

// The signal out of every story it is in. A new story the kobold wrote from
// it alone goes, with its problem when no other story, idea or ticket needs
// it.
function takeOut(edit: Edit, signal: Signal): void {
  for (const story of [...edit.records.stories]) {
    if (!names(story, signal.id)) continue;
    const from = "signals" in story.from ? story.from.signals : [];
    if (story.isNew && from.length === 1 && from[0] === signal.id) {
      edit.remove("stories", story.id);
      if (story.problem) dropIfUnused(edit, story.problem);
    } else edit.put("stories", without(story, signal.id));
  }
}

// The story with the signal taken out of its scenes, of what the persona
// does instead, and of what it was written from (when others are left).
function without(story: Story, signal: string): Story {
  const other = (id: string) => id !== signal;
  for (const scene of story.scenes)
    scene.evidence = scene.evidence.filter(other);
  if (story.instead)
    story.instead.evidence = story.instead.evidence.filter(other);
  if ("signals" in story.from && story.from.signals.length > 1)
    story.from = { signals: story.from.signals.filter(other) };
  return story;
}

function names(story: Story, signal: string): boolean {
  return (
    ("signals" in story.from && story.from.signals.includes(signal)) ||
    story.scenes.some((scene) => scene.evidence.includes(signal)) ||
    (story.instead?.evidence.includes(signal) ?? false)
  );
}

function dropIfUnused(edit: Edit, problem: string): void {
  const { records } = edit;
  const used =
    records.stories.some((s) => s.problem === problem) ||
    records.ideas.some((i) => i.problems.includes(problem)) ||
    records.ticketLinks.some((t) => t.problems.includes(problem)) ||
    records.signals.some(
      (s) => s.wentTo?.to === "problem" && s.wentTo.id === problem,
    );
  const kobolds = edit.find("problems", problem)?.by === KOBOLD;
  if (!used && kobolds) edit.remove("problems", problem);
}
