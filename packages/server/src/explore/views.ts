// What the Explore page shows, from the records and what is worked out
// from them: every idea with who it is for, where it stands and how many
// versions are shared; one idea with the problems and stories it is for,
// its shared versions side by side with their picks, and which one leads;
// and what a new idea can start from. The web interface imports these types
// only.

import {
  derive,
  type Idea,
  type IdeaStage,
  type IdeaState,
  type Records,
  type Story,
  type Version,
} from "@software-factory/core";

import { Refused } from "../refused.ts";

// A persona as Explore names them, with their place among the personas
// (each keeps their colour on every page).
export type PersonaTag = { id: string; name: string; at: number };

export type IdeaRow = {
  id: string;
  title: string;
  persona: PersonaTag | null;
  state: IdeaState;
  // Its stage, from its first version to worked (core's derive).
  stage: IdeaStage;
  // Its versions shared with the team.
  versions: number;
  // Its versions made but not shared yet (absent from an older server).
  unshared?: number;
};

// A story a new idea can start from: one that holds and breaks at a
// problem not solved yet.
export type StoryChoice = {
  id: string;
  title: string;
  persona: PersonaTag;
  problem: { id: string; title: string };
};

// GET /api/explore
export type ExploreList = {
  ideas: IdeaRow[];
  stories: StoryChoice[];
  personas: PersonaTag[];
};

// A problem the idea is for, and the story that breaks at it.
export type IdeaFor = {
  problem: string;
  title: string;
  assumed: boolean;
  story: { id: string; persona: string; title: string } | null;
};

export type VersionCard = Version & { mine: boolean };

// GET /api/explore/idea?id=<idea>
export type IdeaPage = {
  idea: Idea;
  state: IdeaState;
  persona: PersonaTag | null;
  for: IdeaFor[];
  // The story the idea assumes, when it was written from the idea.
  assumed: Story | null;
  // Its versions shared with the team, and how many are not shared yet.
  versions: VersionCard[];
  unshared: number;
  // Whoever is looking (their name in git): their pick is marked.
  me: string;
  // The version with the most picks; none when nobody picked one, or two
  // or more have the most (tie).
  lead: { key: string; name: string } | null;
  tie: boolean;
  // Its GitHub issues, once a version was sent to Build.
  tickets: { issue: number; version: string }[];
  stage: IdeaStage;
  // The last answer to "did it work?" for it, if any.
  answer: { issue: number; worked: string; by: string; on: string } | null;
};

// inApp: the issues the connected board shows closed or in the app.
export function exploreList(
  records: Records,
  inApp: ReadonlySet<number> = new Set(),
): ExploreList {
  const derived = derive(records, inApp);
  const shared = records.versions.filter((v) => v.sharedAt !== null);
  return {
    ideas: records.ideas.map((idea) => ({
      id: idea.id,
      title: idea.title,
      persona: personaOf(records, idea),
      state: derived.ideas[idea.id] ?? "exploring",
      stage: derived.ideaStages[idea.id] ?? "idea",
      versions: shared.filter((v) => v.idea === idea.id).length,
      unshared: records.versions.filter(
        (v) => v.idea === idea.id && v.sharedAt === null,
      ).length,
    })),
    stories: records.stories.flatMap((story) => {
      const problem = records.problems.find((p) => p.id === story.problem);
      const persona = tagOf(records, story.persona);
      if (story.wrong !== null || !problem || !persona) return [];
      if (derived.problems[problem.id] === "solved") return [];
      return [
        {
          id: story.id,
          title: story.title,
          persona,
          problem: { id: problem.id, title: problem.title },
        },
      ];
    }),
    personas: records.personas.map((p, at) => ({ id: p.id, name: p.name, at })),
  };
}

export function ideaPage(
  records: Records,
  id: string,
  { me, inApp = new Set() }: { me: string; inApp?: ReadonlySet<number> },
): IdeaPage {
  const idea = records.ideas.find((one) => one.id === id);
  if (!idea) throw new Refused(`There is no idea “${id}”.`);
  const derived = derive(records, inApp);
  const all = records.versions.filter((v) => v.idea === id);
  const tickets = records.ticketLinks.flatMap((t) =>
    "idea" in t.from && t.from.idea === id
      ? [{ issue: t.issue, version: t.from.version }]
      : [],
  );
  const versions = all
    .filter((v) => v.sharedAt !== null)
    .map((v) => ({ ...v, mine: v.picks.includes(me) }));
  return {
    idea,
    state: derived.ideas[id] ?? "exploring",
    persona: personaOf(records, idea),
    for: idea.problems.map((problem) => forOf(records, problem)),
    assumed:
      records.stories.find((s) => "idea" in s.from && s.from.idea === id) ??
      null,
    versions,
    unshared: all.length - versions.length,
    me,
    ...leadOf(versions),
    tickets: tickets.map((t) => ({ issue: t.issue, version: t.version })),
    stage: derived.ideaStages[id] ?? "idea",
    answer: lastAnswer(
      records,
      tickets.map((t) => t.issue),
    ),
  };
}

// The last answer to "did it work?" among these issues.
export function lastAnswer(
  records: Records,
  issues: number[],
): IdeaPage["answer"] {
  const last = records.outcomes.filter((o) => issues.includes(o.issue)).at(-1);
  return last
    ? { issue: last.issue, worked: last.worked, by: last.by, on: last.on }
    : null;
}

// Which version has the most picks, and whether two share the most.
export function leadOf(versions: Version[]): {
  lead: IdeaPage["lead"];
  tie: boolean;
} {
  const most = Math.max(0, ...versions.map((v) => v.picks.length));
  const top = versions.filter((v) => most > 0 && v.picks.length === most);
  const [first] = top;
  if (top.length !== 1 || !first) return { lead: null, tie: top.length > 1 };
  return { lead: { key: first.key, name: first.name }, tie: false };
}

function forOf(records: Records, id: string): IdeaFor {
  const problem = records.problems.find((p) => p.id === id);
  const story = records.stories.find(
    (s) => s.problem === id && s.wrong === null,
  );
  return {
    problem: id,
    title: problem?.title ?? id,
    assumed: problem?.assumed ?? false,
    story: story
      ? { id: story.id, persona: story.persona, title: story.title }
      : null,
  };
}

// Who the idea is for: its persona, or the persona of its first problem.
function personaOf(records: Records, idea: Idea): PersonaTag | null {
  const problem = records.problems.find((p) => idea.problems.includes(p.id));
  return tagOf(records, idea.persona ?? problem?.persona ?? "");
}

function tagOf(records: Records, id: string): PersonaTag | null {
  const at = records.personas.findIndex((p) => p.id === id);
  const persona = records.personas[at];
  return persona ? { id, name: persona.name, at } : null;
}
