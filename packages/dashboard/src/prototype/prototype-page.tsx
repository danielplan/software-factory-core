// Prototype mode (#prototype/<idea>/<version>): the versions of an idea,
// each the real product running on this computer in its own copy of the
// code, on a dotted canvas: a bar on top with the idea and a switcher (Main,
// the product as it runs today, then A, B, C…), the version shown in a big
// card, and beside it, in a card of its own, the versions with what each is
// doing and "Make another version". "Share" puts the version on Explore, for
// the team to try and choose.

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ProblemBox } from "@/components/problem-box";
import type { FactoryState } from "@/dashboard/dashboard";
import { useRuns, usePrototypePage } from "@/explore/use-explore";
import { runOf } from "@/explore/view";
import { prototypeOf } from "@/lib/routes";

import { Bar } from "./bar";
import { Shown } from "./shown";
import { VersionSide } from "./version-side";

export function PrototypePage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const { t } = useTranslation("explore");
  const { idea, version } = prototypeOf(open);
  if (!idea)
    return (
      <ProblemBox title={t("mode.whichIdea")} text={t("mode.fromExplore")} />
    );
  return <Mode state={state} idea={idea} version={version} />;
}

function Mode({
  state,
  idea,
  version,
}: Readonly<{ state: FactoryState; idea: string; version: string | null }>) {
  const { t } = useTranslation("explore");
  const { data, problem } = usePrototypePage(idea);
  const runs = useRuns(idea);
  const [said, setSaid] = useState<string | null>(null);
  if (problem)
    return <ProblemBox title={t("idea.cannotShow")} text={problem} />;
  if (!data) return null;
  const shown = data.versions.find((v) => v.key === version) ?? null;
  const key = shown?.key ?? null;
  return (
    <div className="fixed inset-0 z-30 grid grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-y-auto bg-dots p-3 lg:overflow-hidden">
      <Bar
        page={data}
        shown={key}
        onProblem={setSaid}
        shared={shown?.sharedAt !== null}
      />
      <div className="grid gap-3 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Shown
          key={key ?? "main"}
          page={data}
          version={shown}
          run={key ? runOf(runs, idea, key) : null}
          parts={state.parts}
          onProblem={setSaid}
        />
        <VersionSide page={data} runs={runs} shown={key} />
      </div>
      {said && (
        <div className="fixed bottom-4 left-4 max-w-xl">
          <ProblemBox title={t("idea.failed")} text={said} />
        </div>
      )}
    </div>
  );
}
