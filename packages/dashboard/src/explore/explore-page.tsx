// Explore: the ideas for the people this product is for, as a grid of
// cards by step (plan, prototypes, handed off, dropped), each with who it
// is for, where it stands and, when it says more, what is next. A card opens the idea in a dialog over
// the grid (#explore/<idea>): its versions to try and vote for, and the row
// to send one to Build. "New idea" starts one from a story or from your own
// (#explore/new). The ideas shaped with the old idea coach stay below, each
// opening its workspace as before.

import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ExploreList, IdeaRow } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { StageSteps } from "@/components/stage-steps";
import type { FactoryState } from "@/dashboard/dashboard";
import { IdeaCard } from "@/ideas/idea-card";
import { IdeaWorkspace } from "@/ideas/idea-workspace";
import {
  exploreHash,
  exploreOf,
  type ExplorePlace,
  newIdeaHash,
} from "@/lib/routes";
import { ideaSteps } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { Initial } from "@/understand/bits";
import { tintOf } from "@/understand/view";

import { IdeaDialog } from "./idea-detail";
import { NewIdea } from "./new-idea";
import { useExploreList } from "./use-explore";
import { canSend, ideaGroups, ideaNext, type Step } from "./view";

export function ExplorePage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const { t } = useTranslation("explore");
  const place = exploreOf(open);
  // An idea from before Kobble keeps its own workspace.
  const old = state.ideas.find((one) => one.id === place.idea);
  const { data, problem } = useExploreList();
  if (old) return <IdeaWorkspace idea={old} />;
  return (
    <div className="grid content-start gap-6">
      <PageHead title={t("page.title")} />
      {problem && <ProblemBox title={t("page.cannotRead")} text={problem} />}
      {data && <Grid ideas={data.ideas} />}
      <FromBefore ideas={state.ideas} />
      <IdeaDialog
        id={place.idea}
        sendable={canSend(state.company.tracker, state.board)}
        onClose={() => {
          window.location.hash = exploreHash();
        }}
      />
      {data && <StartOne list={data} place={place} />}
    </div>
  );
}

// The new idea dialog, open at #explore/new (with a story picked at
// #explore/new/<story>); closing it goes back to the grid.
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
        window.location.hash = exploreHash();
      }}
    />
  );
}

// The ideas by step, each step a grid of cards: Plan always (it ends with
// the card to start a new idea), the others only when they hold ideas.
// What was handed off is quieter, what was dropped the quietest.
const QUIET: Record<Step, Quiet> = {
  plan: "no",
  prototypes: "no",
  handedOff: "some",
  dropped: "most",
};

function Grid({ ideas }: Readonly<{ ideas: IdeaRow[] }>) {
  const { t } = useTranslation("explore");
  return (
    <>
      {ideaGroups(ideas).map(({ step, ideas: here }) =>
        step === "plan" || here.length > 0 ? (
          <Group key={step} title={t(`groups.${step}`)} count={here.length}>
            {here.map((idea) => (
              <IdeaTile key={idea.id} idea={idea} quiet={QUIET[step]} />
            ))}
            {step === "plan" && <NewTile />}
          </Group>
        ) : null,
      )}
    </>
  );
}

function Group({
  title,
  count,
  children,
}: Readonly<{
  title: string;
  count: number;
  children: React.ReactNode;
}>) {
  return (
    <section aria-label={title} className="grid gap-3">
      <h2 className="flex items-baseline gap-2 text-section">
        {title}
        <span className="text-tag text-muted-foreground">{count}</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {children}
      </div>
    </section>
  );
}

type Quiet = "no" | "some" | "most";

// One idea: who it is for, its title, where it stands, and what is next
// when that says more than the stage.
function IdeaTile({ idea, quiet }: Readonly<{ idea: IdeaRow; quiet: Quiet }>) {
  const next = ideaNext(idea);
  return (
    <a
      href={exploreHash(idea.id)}
      className={cn(
        "grid min-h-32 content-between gap-4 rounded-[18px] bg-card p-4 shadow-soft transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        quiet === "some" && "bg-card/70",
        quiet === "most" && "bg-card/50 opacity-80",
      )}
    >
      <span className="grid gap-2">
        {idea.persona && (
          <span className="flex items-center gap-2 text-note text-muted-foreground">
            <Initial
              name={idea.persona.name}
              tint={tintOf(idea.persona.at)}
              small
            />
            {idea.persona.name}
          </span>
        )}
        <span
          className={cn("text-item", quiet !== "no" && "text-foreground-2")}
        >
          {idea.title}
        </span>
      </span>
      <span className="grid gap-1">
        <StageSteps steps={ideaSteps(idea.stage)} />
        {next && (
          <span className="text-note text-muted-foreground">{next}</span>
        )}
      </span>
    </a>
  );
}

function NewTile() {
  const { t } = useTranslation("explore");
  return (
    <a
      href={newIdeaHash()}
      className="grid min-h-32 place-items-center rounded-[18px] border-2 border-dashed border-primary/45 bg-primary/[0.04] text-body font-medium text-primary transition-colors hover:border-primary hover:bg-primary/[0.08] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="grid justify-items-center gap-1.5">
        <Plus aria-hidden className="size-5" />
        {t("page.newIdea")}
      </span>
    </a>
  );
}

// The ideas shaped with the idea coach before Kobble, each opening its
// workspace.
function FromBefore({ ideas }: Readonly<{ ideas: FactoryState["ideas"] }>) {
  const { t } = useTranslation("explore");
  if (ideas.length === 0) return null;
  return (
    <section aria-label={t("groups.before")} className="grid gap-3 pt-2">
      <h2 className="text-section">{t("groups.before")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((one) => (
          <IdeaCard key={one.id} idea={one} />
        ))}
      </div>
    </section>
  );
}
