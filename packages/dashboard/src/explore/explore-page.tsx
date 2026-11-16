// Explore: the ideas for the people this product is for, each with who it
// is for and where it stands, and one idea open beside them
// (#explore/<idea>) with its versions side by side, the picks, and one
// action: send the version with the most picks to Build. "New idea" starts
// one from a story or from your own (#explore/new). The ideas shaped with
// the old idea coach stay below, each opening its workspace as before.

import type { ExploreList, IdeaRow } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import type { FactoryState } from "@/dashboard/dashboard";
import { IdeaCard } from "@/ideas/idea-card";
import { IdeaWorkspace } from "@/ideas/idea-workspace";
import {
  exploreHash,
  exploreOf,
  type ExplorePlace,
  newIdeaHash,
  prototypeHash,
} from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { tintOf } from "@/understand/view";

import { IdeaDetail } from "./idea-detail";
import { NewIdea } from "./new-idea";
import { useExploreList } from "./use-explore";
import { rowWords } from "./view";

export function ExplorePage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const place = exploreOf(open);
  // An idea from before Kobble keeps its own workspace.
  const old = state.ideas.find((one) => one.id === place.idea);
  const { data, problem } = useExploreList();
  if (old) return <IdeaWorkspace idea={old} />;
  const shown = shownOf(data, place.idea);
  return (
    <div className="grid content-start gap-4">
      <PageHead
        title="Explore"
        about="Compare the versions made in prototype mode. Pick one and send it to Build."
        actions={<Actions shown={shown} />}
      />
      {problem && (
        <ProblemBox title="The ideas cannot be read" text={problem} />
      )}
      {data && <Ideas ideas={data.ideas} shown={shown} />}
      <FromBefore ideas={state.ideas} />
      {data && <StartOne list={data} place={place} />}
    </div>
  );
}

// The idea open, or the first one.
function shownOf(data: ExploreList | null, idea: string | null) {
  const ideas = data?.ideas ?? [];
  return (ideas.find((one) => one.id === idea) ?? ideas[0])?.id ?? null;
}

// The new idea dialog, open at #explore/new (with a story picked at
// #explore/new/<story>); closing it goes back to the idea that was open.
function StartOne({
  list,
  place,
}: Readonly<{ list: ExploreList; place: ExplorePlace }>) {
  const story = place.newIdea?.story ?? null;
  return (
    <NewIdea
      key={story ?? ""}
      open={place.newIdea !== null}
      story={story}
      list={list}
      onClose={() => {
        window.location.hash = exploreHash(place.idea ?? undefined);
      }}
    />
  );
}

// The ideas, and the one shown beside them.
function Ideas({
  ideas,
  shown,
}: Readonly<{ ideas: IdeaRow[]; shown: string | null }>) {
  if (!shown)
    return (
      <p className="rounded-2xl bg-card px-5 py-4 text-sm text-muted-foreground shadow-soft">
        No ideas yet. Start one from a story where something breaks, or from
        your own: New idea.
      </p>
    );
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <IdeaList ideas={ideas} shown={shown} />
      <IdeaDetail id={shown} />
    </div>
  );
}

function Actions({ shown }: Readonly<{ shown: string | null }>) {
  return (
    <>
      {shown && (
        <Button asChild variant="outline">
          <a href={prototypeHash(shown)}>Open prototype mode</a>
        </Button>
      )}
      <Button asChild>
        <a href={newIdeaHash()}>New idea</a>
      </Button>
    </>
  );
}

// The ideas shaped with the idea coach before Kobble, each opening its
// workspace.
function FromBefore({ ideas }: Readonly<{ ideas: FactoryState["ideas"] }>) {
  if (ideas.length === 0) return null;
  return (
    <section aria-label="Ideas from before" className="grid gap-2 pt-2">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">
        Ideas from before, shaped with the idea coach
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((one) => (
          <IdeaCard key={one.id} idea={one} />
        ))}
      </div>
    </section>
  );
}

function IdeaList({
  ideas,
  shown,
}: Readonly<{ ideas: IdeaRow[]; shown: string }>) {
  return (
    <nav aria-label="Ideas" className="grid gap-2">
      {ideas.map((idea) => (
        <a
          key={idea.id}
          href={exploreHash(idea.id)}
          aria-current={idea.id === shown ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl bg-card px-3.5 py-3 shadow-soft transition-shadow hover:shadow-lift",
            idea.id === shown && "ring-2 ring-foreground",
          )}
        >
          <Initial
            name={idea.persona?.name ?? "?"}
            tint={tintOf(idea.persona?.at ?? 0)}
          />
          <span className="grid min-w-0">
            <span className="truncate text-sm font-semibold">{idea.title}</span>
            <span className="text-[13px] text-muted-foreground">
              {rowWords(idea)}
            </span>
          </span>
        </a>
      ))}
    </nav>
  );
}
