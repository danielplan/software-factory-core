// Under a story: the problem it breaks at, where it stands (and why, when
// that says more than the ideas below), and the ideas for it, with a way
// to start one. Why it matters lives on the person's page, with the real
// problem.

import { useTranslation } from "react-i18next";

import type { StoryPage } from "@/api";
import { StageSteps } from "@/components/stage-steps";
import { Button } from "@/components/ui/button";
import { exploreHash, newIdeaHash } from "@/lib/routes";
import { problemSteps } from "@/lib/stages";

import { Label } from "./bits";
import { stageWhy } from "./view";

export function StoryProblem({ page }: Readonly<{ page: StoryPage }>) {
  const { t } = useTranslation("understand");
  const { problem, stage } = page;
  if (!problem) return null;
  return (
    <section
      aria-label={t("problem.label")}
      className="grid gap-4 rounded-2xl bg-card p-5 shadow-soft"
    >
      <div className="grid gap-1.5">
        <Label>
          {problem.assumed ? t("problem.labelAssumed") : t("problem.label")}
        </Label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <h2 className="text-section">{problem.title}</h2>
          {stage && <StageSteps steps={problemSteps(stage)} />}
        </div>
        {/* Trying ideas: the ideas are listed just below. */}
        {stage && stage !== "trying" && (
          <p className="text-note text-muted-foreground">
            {stageWhy(stage, page)}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label>{t("problem.ideas")}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {page.ideas.length === 0 && (
            <span className="text-note text-muted-foreground">
              {t("problem.noIdeas")}
            </span>
          )}
          {page.ideas.map((idea) => (
            <a
              key={idea.id}
              href={exploreHash(idea.id)}
              className="flex h-8 items-center gap-2 rounded-full border px-3 text-body transition-colors hover:bg-hover"
            >
              {idea.title}
              <span className="text-tag text-muted-foreground">
                {t(`problem.idea.${idea.state}`)}
              </span>
            </a>
          ))}
          <Button asChild variant="outline" size="sm">
            <a href={newIdeaHash(page.story.id)}>{t("problem.startIdea")}</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
