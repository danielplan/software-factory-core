// Understand: the people this product is for, their stories, and where
// things break for them, in three levels with a breadcrumb: every persona
// (#understand), one persona (#understand/<persona>), one of their stories
// (#understand/<persona>/<story>). Each level asks one question under its
// title, so it is clear what to do there. What is shown is read again
// whenever the records change. "Add a source" brings in something that
// came in.

import type { SignalView, StoryPage } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { understandHash, understandOf } from "@/lib/routes";

import { AddSource } from "./add-source";
import { Overview } from "./overview";
import { PersonaView } from "./persona-view";
import { StoryView } from "./story-view";
import { useOverview, usePersona, useStory } from "./use-records";
import { tintOf } from "./view";

const HOME = { name: "Understand", href: understandHash() };

export function UnderstandPage({ open }: Readonly<{ open: string | null }>) {
  const { persona, story } = understandOf(open);
  const { data: overview, problem } = useOverview();
  // Each persona keeps their colour on every level.
  const order = overview?.personas.map((card) => card.persona.id) ?? [];
  const tint = (id: string) => tintOf(Math.max(order.indexOf(id), 0));
  const personaName = (id: string) =>
    overview?.personas.find((card) => card.persona.id === id)?.persona.name ??
    id;
  if (problem)
    return <ProblemBox title="The records cannot be read" text={problem} />;
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
      <PageHead
        crumbs={[HOME]}
        title="Understand"
        about="What’s new to look at?"
        actions={<AddSource />}
      />
      {overview && (
        <Overview overview={overview} tint={tint} personaName={personaName} />
      )}
    </div>
  );
}

function PersonaLevel({
  id,
  tint,
}: Readonly<{ id: string; tint: (id: string) => string }>) {
  const { data, problem } = usePersona(id);
  if (problem)
    return <ProblemBox title="This persona cannot be shown" text={problem} />;
  if (!data) return null;
  const { persona } = data;
  return (
    <div className="grid content-start gap-4">
      <PageHead
        crumbs={[HOME, { name: persona.name }]}
        title={persona.name}
        about={
          data.realProblems.length > 0
            ? `Is this the real problem for ${persona.name}?`
            : `What is the real problem for ${persona.name}?`
        }
        actions={<AddSource />}
      />
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
  const { data, problem } = useStory(id);
  if (problem)
    return <ProblemBox title="This story cannot be shown" text={problem} />;
  if (!data) return null;
  const { persona, story } = data;
  return (
    <div className="grid content-start gap-4">
      <PageHead
        crumbs={[
          HOME,
          { name: persona.name, href: understandHash(persona.id) },
          { name: story.title },
        ]}
        title={story.title}
        about="Is this how it happens? What is still guessed?"
        actions={<AddSource />}
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
