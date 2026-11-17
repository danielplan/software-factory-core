// Personas (#understand): who uses the product, in three levels with a
// breadcrumb: every persona as a row (#understand), one persona with their
// problems, what people like them said and their tests
// (#understand/<persona>), one of their stories, step by step
// (#understand/<persona>/<story>). What is shown is read again whenever the
// records change. What comes in is added and looked at on Signals.

import { useTranslation } from "react-i18next";

import type { SignalView, StoryPage } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { understandHash, understandOf } from "@/lib/routes";

import { Overview } from "./overview";
import { PersonaView } from "./persona-view";
import { StoryView } from "./story-view";
import { useOverview, usePersona, useStory } from "./use-records";
import { tintOf } from "./view";

// The breadcrumb's first step.
function useHome() {
  const { t } = useTranslation("understand");
  return { name: t("page.title"), href: understandHash() };
}

export function UnderstandPage({ open }: Readonly<{ open: string | null }>) {
  const { t } = useTranslation("understand");
  const home = useHome();
  const { persona, story } = understandOf(open);
  const { data: overview, problem } = useOverview();
  // Each persona keeps their colour on every level.
  const order = overview?.personas.map((card) => card.persona.id) ?? [];
  const tint = (id: string) => tintOf(Math.max(order.indexOf(id), 0));
  if (problem) return <ProblemBox title={t("page.cantRead")} text={problem} />;
  if (story)
    return (
      <StoryLevel
        id={story}
        tint={tint}
        toLookAt={overview?.kobold.toLookAt ?? []}
      />
    );
  if (persona) return <PersonaLevel id={persona} tint={tint} />;
  return (
    <div className="grid content-start gap-4">
      <PageHead crumbs={[home]} title={t("page.title")} />
      {overview && <Overview overview={overview} tint={tint} />}
    </div>
  );
}

function PersonaLevel({
  id,
  tint,
}: Readonly<{ id: string; tint: (id: string) => string }>) {
  const { t } = useTranslation("understand");
  const home = useHome();
  const { data, problem } = usePersona(id);
  if (problem)
    return <ProblemBox title={t("page.personCantShow")} text={problem} />;
  if (!data) return null;
  const { persona } = data;
  return (
    <div className="grid content-start gap-4">
      <PageHead crumbs={[home, { name: persona.name }]} title={persona.name} />
      <PersonaView page={data} tint={tint(persona.id)} />
    </div>
  );
}

function StoryLevel({
  id,
  tint,
  toLookAt,
}: Readonly<{
  id: string;
  tint: (id: string) => string;
  toLookAt: SignalView[];
}>) {
  const { t } = useTranslation("understand");
  const home = useHome();
  const { data, problem } = useStory(id);
  if (problem)
    return <ProblemBox title={t("page.storyCantShow")} text={problem} />;
  if (!data) return null;
  const { persona, story } = data;
  return (
    <div className="grid content-start gap-4">
      <PageHead
        crumbs={[
          home,
          { name: persona.name, href: understandHash(persona.id) },
          { name: story.title },
        ]}
        title={story.title}
      />
      <StoryView
        page={data}
        tint={tint(persona.id)}
        toLookAt={toLookAt.filter((signal) => isIn(signal, data))}
      />
    </div>
  );
}

// What the kobold put in this story, or at its problem, that nobody has
// looked at yet.
function isIn(signal: SignalView, page: StoryPage): boolean {
  const { went } = signal;
  if (went?.to === "story") return went.story === page.story.id;
  return went?.to === "problem" && went.problem === page.story.problem;
}
