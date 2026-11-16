// One idea on Explore: who it is for and which problem (with its story in
// Understand), what we think it would do, its shared versions side by side
// to try and pick, and the one action: send the version with the most picks
// to Build. Without versions, a way to prototype mode, where they are made.

import { useState } from "react";

import { type IdeaPage, messageOf, post } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { exploreHash, prototypeHash, understandHash } from "@/lib/routes";
import { Initial, KoboldMark, Label } from "@/understand/bits";
import { tintOf } from "@/understand/view";

import { useIdeaPage, useRuns } from "./use-explore";
import { VersionTile } from "./version-tile";
import { runOf, sendLine, stateWords } from "./view";

export function IdeaDetail({ id }: Readonly<{ id: string }>) {
  const { data, problem } = useIdeaPage(id);
  const runs = useRuns(id);
  const [sending, setSending] = useState<string | null>(null);
  if (problem)
    return <ProblemBox title="This idea cannot be shown" text={problem} />;
  if (!data) return null;
  const { idea } = data;
  return (
    <section
      aria-label={idea.title}
      className="grid gap-4 rounded-2xl bg-card px-6 py-5 shadow-soft"
    >
      <div className="flex items-baseline gap-3">
        <h2 className="flex-1 text-2xl font-semibold tracking-[-0.01em]">
          {idea.title}
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {stateWords(data.state)}
        </span>
      </div>
      <ForWhom page={data} />
      <p className="text-[15px]">
        <span className="text-muted-foreground">We think </span>
        {idea.weThink}
      </p>
      {data.versions.length === 0 ? (
        <NoVersions page={data} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.versions.map((version) => (
              <VersionTile
                key={version.key}
                version={version}
                run={runOf(runs, idea.id, version.key)}
                onProblem={setSending}
              />
            ))}
          </div>
          {data.unshared > 0 && (
            <p className="text-[13px] text-muted-foreground">
              {data.unshared} more in prototype mode, not shared yet.
            </p>
          )}
          <SendBar page={data} onProblem={setSending} />
        </>
      )}
      {sending && <ProblemBox title="That did not work" text={sending} />}
    </section>
  );
}

// Who it is for, and the problem with the story that breaks at it.
function ForWhom({ page }: Readonly<{ page: IdeaPage }>) {
  const { persona } = page;
  const tint = tintOf(persona?.at ?? 0);
  const story = page.assumed;
  return (
    <div className="grid gap-1.5">
      {page.for.map((one) => (
        <p key={one.problem} className="flex items-center gap-2.5 text-[15px]">
          <Initial name={persona?.name ?? "?"} tint={tint} />
          <span>
            For{" "}
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
            {persona && ` (${persona.name})`}
            {one.assumed && (
              <span className="text-muted-foreground"> · assumed</span>
            )}
          </span>
        </p>
      ))}
      {page.for.length === 0 && persona && (
        <p className="flex items-center gap-2.5 text-[15px]">
          <Initial name={persona.name} tint={tint} />
          <span>
            For <b>{persona.name}</b>
            {story && (
              <>
                {", in "}
                <a
                  href={understandHash(story.persona, story.id)}
                  className="underline-offset-4 hover:underline"
                >
                  {story.title}
                </a>
              </>
            )}
          </span>
        </p>
      )}
    </div>
  );
}

function NoVersions({ page }: Readonly<{ page: IdeaPage }>) {
  const discard = () => {
    if (!window.confirm(`Throw “${page.idea.title}” away?`)) return;
    void post("/api/explore/discard", { idea: page.idea.id }).then(() => {
      window.location.hash = exploreHash();
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-4">
      <KoboldMark />
      <span className="flex-1 text-sm">
        No versions yet.
        {page.unshared > 0
          ? ` ${String(page.unshared)} in prototype mode, not shared yet.`
          : " Make some in prototype mode and share them here."}
      </span>
      {page.unshared === 0 && page.tickets.length === 0 && (
        <Button variant="ghost" size="sm" onClick={discard}>
          Throw it away
        </Button>
      )}
      <Button asChild variant="outline" size="sm">
        <a href={prototypeHash(page.idea.id)}>Open prototype mode</a>
      </Button>
    </div>
  );
}

// The line about the picks, and "Send B to Build".
function SendBar({
  page,
  onProblem,
}: Readonly<{ page: IdeaPage; onProblem: (problem: string | null) => void }>) {
  const [busy, setBusy] = useState(false);
  const line = sendLine(page);
  const send = async () => {
    if (!line.version) return;
    setBusy(true);
    onProblem(null);
    try {
      await post("/api/explore/send", {
        idea: page.idea.id,
        version: line.version,
      });
    } catch (error) {
      onProblem(messageOf(error));
    }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface px-4 py-3.5">
      <span className="flex-1 text-sm">{line.words}</span>
      {line.button && (
        <Button disabled={!line.version || busy} onClick={() => void send()}>
          {line.button}
        </Button>
      )}
      {!line.button && <Label>In Build</Label>}
    </div>
  );
}
