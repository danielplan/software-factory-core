// One idea, in a dialog over Explore's grid (#explore/<idea>): its title
// and where it stands in one line, then in a small block who it is for,
// which problem (with its story in Understand) and what we think it would
// do; then its versions, to try and vote for, and the row to send one to
// Build (idea-steps.tsx). Closing it goes back to the grid.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { IdeaPage } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { DOT } from "@/components/row-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { understandHash } from "@/lib/routes";
import { ideaSteps } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { tintOf } from "@/understand/view";

import { IdeaSteps } from "./idea-steps";
import { useIdeaPage, useRuns } from "./use-explore";
import { ideaWhy } from "./view";

export function IdeaDialog({
  id,
  sendable,
  onClose,
}: Readonly<{ id: string | null; sendable: boolean; onClose: () => void }>) {
  return (
    <Dialog
      open={id !== null}
      onOpenChange={(now) => {
        if (!now) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] gap-0 overflow-y-auto rounded-[22px] p-0 sm:max-w-3xl">
        {id && <IdeaDetail key={id} id={id} sendable={sendable} />}
      </DialogContent>
    </Dialog>
  );
}

function IdeaDetail({
  id,
  sendable,
}: Readonly<{ id: string; sendable: boolean }>) {
  const { t } = useTranslation("explore");
  const { data, problem } = useIdeaPage(id);
  const runs = useRuns(id);
  const [failed, setFailed] = useState<string | null>(null);
  if (problem)
    return (
      <div className="p-6">
        <DialogTitle className="sr-only">{t("idea.cannotShow")}</DialogTitle>
        <ProblemBox title={t("idea.cannotShow")} text={problem} />
      </div>
    );
  if (!data)
    return <DialogTitle className="sr-only">{t("idea.loading")}</DialogTitle>;
  const { idea } = data;
  return (
    <div className="grid gap-4 p-5 sm:p-6">
      <div className="grid gap-1 pr-8">
        <DialogTitle className="text-section">{idea.title}</DialogTitle>
        <DialogDescription asChild>
          <Status page={data} />
        </DialogDescription>
      </div>
      <Context page={data} />
      <IdeaSteps
        page={data}
        runs={runs}
        sendable={sendable}
        onProblem={setFailed}
      />
      {failed && <ProblemBox title={t("idea.failed")} text={failed} />}
    </div>
  );
}

// Where the idea stands, in one line: its stage and why.
function Status({ page }: Readonly<{ page: IdeaPage }>) {
  const steps = ideaSteps(page.stage);
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-note text-muted-foreground">
      <span
        aria-hidden
        className={cn("size-2 rounded-full", DOT[steps.tone])}
      />
      <span className="font-medium text-foreground-2">{steps.name}</span>
      <span aria-hidden>·</span>
      {ideaWhy(page)}
    </p>
  );
}

// Who it is for and the problem, then what we think, in one small block.
function Context({ page }: Readonly<{ page: IdeaPage }>) {
  const { t } = useTranslation("explore");
  const { persona, idea } = page;
  return (
    <div className="flex gap-3 rounded-xl bg-surface px-4 py-3">
      <Initial
        name={persona?.name ?? "?"}
        tint={tintOf(persona?.at ?? 0)}
        small
      />
      <div className="grid min-w-0 gap-1">
        <ForWhom page={page} />
        {idea.weThink && (
          <p className="text-body text-muted-foreground">
            {t("idea.weThink", { what: idea.weThink })}
          </p>
        )}
      </div>
    </div>
  );
}

// "For Mia · The basket is empty by evening", each problem it is for (its
// story in Understand), or the story it assumes.
function ForWhom({ page }: Readonly<{ page: IdeaPage }>) {
  const { t } = useTranslation("explore");
  const story = page.assumed;
  return (
    <p className="text-body">
      <span className="font-medium">
        {page.persona
          ? t("idea.forWhom", { name: page.persona.name })
          : t("idea.forNobody")}
      </span>
      {page.for.map((one) => (
        <span key={one.problem}>
          <span className="text-muted-foreground"> · </span>
          {one.story ? (
            <a
              href={understandHash(one.story.persona, one.story.id)}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {one.title}
            </a>
          ) : (
            <b>{one.title}</b>
          )}
          {one.assumed && (
            <span className="text-muted-foreground"> {t("idea.assumed")}</span>
          )}
        </span>
      ))}
      {page.for.length === 0 && story && (
        <>
          <span className="text-muted-foreground"> · </span>
          <a
            href={understandHash(story.persona, story.id)}
            className="underline-offset-4 hover:underline"
          >
            {story.title}
          </a>
        </>
      )}
    </p>
  );
}
