// Beside a story: the problem it breaks at, the stage it is at with every
// step named and a line of why, and the ideas for it, with a way to start
// one. Why it matters lives on the persona, with the real problem.

import type { StoryPage } from "@/api";
import { StageSteps } from "@/components/stage-steps";
import { Button } from "@/components/ui/button";
import { problemSteps } from "@/lib/stages";
import { exploreHash, newIdeaHash } from "@/lib/routes";

import { Label } from "./bits";
import { stageWhy } from "./view";

const IDEA_STATES = {
  exploring: "Exploring",
  inBuild: "In Build",
  worked: "Worked",
  didntWork: "Didn't work",
} as const;

export function StorySide({ page }: Readonly<{ page: StoryPage }>) {
  const { problem } = page;
  if (!problem)
    return (
      <aside className="rounded-2xl bg-card px-6 py-5 text-sm text-muted-foreground shadow-soft">
        It breaks at no problem: it turned out wrong.
      </aside>
    );
  return (
    <aside
      aria-label="Where it breaks"
      className="grid gap-4 rounded-2xl bg-card px-6 py-5 shadow-soft"
    >
      <div className="grid gap-2">
        <Label>Where it breaks</Label>
        <h2 className="text-xl leading-snug font-semibold">{problem.title}</h2>
        {problem.assumed && (
          <span className="text-xs text-label">assumed, from an idea</span>
        )}
      </div>
      {page.stage && (
        <div className="grid gap-2.5">
          <StageSteps steps={problemSteps(page.stage)} whole />
          <p className="text-[13px] text-muted-foreground">
            {stageWhy(page.stage, page)}
          </p>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>Ideas for it</Label>
        {page.ideas.length === 0 && (
          <span className="text-[13px] text-muted-foreground">
            No idea for it yet.
          </span>
        )}
        {page.ideas.map((idea) => (
          <a
            key={idea.id}
            href={exploreHash(idea.id)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm shadow-soft hover:shadow-lift"
          >
            <span className="flex-1">{idea.title}</span>
            <span className="text-[13px] text-muted-foreground">
              {IDEA_STATES[idea.state]}
            </span>
          </a>
        ))}
      </div>
      <Button asChild variant="outline" className="w-fit">
        <a href={newIdeaHash(page.story.id)}>Start an idea</a>
      </Button>
    </aside>
  );
}
