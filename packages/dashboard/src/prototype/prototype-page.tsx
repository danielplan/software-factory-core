// Prototype mode (#prototype/<idea>/<version>): the versions of an idea,
// each the real product running on this computer in its own copy of the
// code. A dark bar on top with the idea and a switcher (Main, the product as
// it runs today, then A, B, C…), the version shown in a frame, and beside it
// the versions with what each is doing and "Make another version". "Share"
// puts the version on Explore, for the team to try and pick.

import { useState } from "react";

import { messageOf, post, type PrototypePage as Page } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";
import { useRuns, usePrototypePage } from "@/explore/use-explore";
import { runOf } from "@/explore/view";
import { exploreHash, prototypeHash, prototypeOf } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { KoboldMark } from "@/understand/bits";

import { Shown } from "./shown";
import { VersionSide } from "./version-side";

export function PrototypePage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const { idea, version } = prototypeOf(open);
  if (!idea)
    return (
      <ProblemBox
        title="Which idea?"
        text="Open prototype mode from an idea on Explore."
      />
    );
  return <Mode state={state} idea={idea} version={version} />;
}

function Mode({
  state,
  idea,
  version,
}: Readonly<{ state: FactoryState; idea: string; version: string | null }>) {
  const { data, problem } = usePrototypePage(idea);
  const runs = useRuns(idea);
  const [said, setSaid] = useState<string | null>(null);
  if (problem)
    return <ProblemBox title="This idea cannot be shown" text={problem} />;
  if (!data) return null;
  const shown = data.versions.find((v) => v.key === version) ?? null;
  const key = shown?.key ?? null;
  return (
    <div className="fixed inset-0 z-30 grid grid-rows-[auto_minmax(0,1fr)] bg-background">
      <Bar
        page={data}
        shown={key}
        onProblem={setSaid}
        shared={shown?.sharedAt !== null}
      />
      <div className="grid min-h-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Shown
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
          <ProblemBox title="That did not work" text={said} />
        </div>
      )}
    </div>
  );
}

// The dark bar: what this is, the idea, the switcher, back and share.
function Bar({
  page,
  shown,
  shared,
  onProblem,
}: Readonly<{
  page: Page;
  shown: string | null;
  shared: boolean;
  onProblem: (problem: string | null) => void;
}>) {
  const share = async () => {
    onProblem(null);
    try {
      await post("/api/prototypes/share", {
        idea: page.idea.id,
        version: shown,
      });
    } catch (error) {
      onProblem(messageOf(error));
    }
  };
  const keys = [null, ...page.versions.map((v) => v.key)];
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-neutral-900 px-5 py-2.5 text-white">
      <KoboldMark />
      <span className="font-semibold">Prototype mode</span>
      <span className="text-sm text-white/60 max-sm:hidden">
        runs on your machine
      </span>
      <span className="border-l border-white/20 pl-4 text-sm">
        Idea: {page.idea.title}
      </span>
      <nav
        aria-label="Version"
        className="mx-auto flex gap-1 rounded-xl bg-white/10 p-1"
      >
        {keys.map((key) => (
          <a
            key={key ?? "main"}
            href={prototypeHash(page.idea.id, key ?? undefined)}
            aria-current={key === shown ? "page" : undefined}
            className={cn(
              "rounded-lg px-3.5 py-1.5 text-[13px] font-semibold text-white/80",
              key === shown && "bg-white text-neutral-900",
            )}
          >
            {key ?? "Main"}
          </a>
        ))}
      </nav>
      <Button
        asChild
        variant="outline"
        size="sm"
        className="border-white/30 bg-transparent text-white hover:bg-white/10"
      >
        <a href={exploreHash(page.idea.id)}>Back to Kobble</a>
      </Button>
      <Button
        size="sm"
        className="bg-white text-neutral-900 hover:bg-white/90"
        disabled={shown === null || shared}
        onClick={() => void share()}
      >
        {shown !== null && shared ? "Shared" : "Share"}
      </Button>
    </header>
  );
}
