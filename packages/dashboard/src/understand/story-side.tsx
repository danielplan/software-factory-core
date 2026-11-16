// Beside a story: the problem it breaks at (where it stands and why, what
// is behind it), the real problem behind that and what else it sits
// behind, and the ideas for it, with a way to start one.

import type { StoryPage } from "@/api";
import { Button } from "@/components/ui/button";

import { Label, Pill } from "./bits";
import { problemWhy, stateOf } from "./view";

const IDEA_STATES = {
  exploring: "Exploring",
  inBuild: "In Build",
  worked: "Worked",
  didntWork: "Didn't work",
} as const;

export function StorySide({ page }: Readonly<{ page: StoryPage }>) {
  const { problem, realProblem } = page;
  if (!problem)
    return (
      <aside className="rounded-2xl bg-card px-6 py-5 text-sm text-muted-foreground shadow-soft">
        It breaks at no problem: it turned out wrong.
      </aside>
    );
  const state = stateOf({ problemState: problem.state, wrong: null });
  return (
    <aside
      aria-label="Where it breaks"
      className="grid gap-4 rounded-2xl bg-card px-6 py-5 shadow-soft"
    >
      <div className="grid gap-2">
        <Label>Where it breaks: the problem</Label>
        <h2 className="text-xl leading-snug font-semibold">{problem.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone={state.tone}>{state.words}</Pill>
          {problem.assumed && (
            <span className="text-xs text-muted-foreground">
              assumed, from an idea
            </span>
          )}
        </div>
        <p className="text-sm">{problemWhy(page)}</p>
      </div>
      {problem.reading && (
        <div className="grid gap-1 rounded-xl bg-surface px-3.5 py-3">
          <Label>What's behind it</Label>
          <p className="text-[15px] leading-relaxed">{problem.reading}</p>
        </div>
      )}
      {realProblem && (
        <div className="grid gap-1">
          <Label>The real problem behind it</Label>
          <span className="text-[15px] font-medium">{realProblem.title}</span>
          <span className="text-[13px] text-muted-foreground">
            {page.alsoBehind.length > 0
              ? `Also behind: ${page.alsoBehind.map((p) => p.title).join(" · ")}`
              : "Only behind this problem so far"}
          </span>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label>Ideas</Label>
        {page.ideas.length === 0 && (
          <span className="text-[13px] text-muted-foreground">
            No idea for it yet.
          </span>
        )}
        {page.ideas.map((idea) => (
          <a
            key={idea.id}
            href="#explore"
            className="flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm hover:bg-surface"
          >
            <span className="flex-1">{idea.title}</span>
            <span className="text-[13px] text-muted-foreground">
              {IDEA_STATES[idea.state]}
            </span>
          </a>
        ))}
      </div>
      <Button asChild className="w-fit">
        <a href="#explore">Start an idea</a>
      </Button>
    </aside>
  );
}
