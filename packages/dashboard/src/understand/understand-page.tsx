// Understand: the people this product is for, their stories, and where
// things break for them, in three levels with a breadcrumb: every persona
// (#understand), one persona (#understand/<persona>), one of their stories
// (#understand/<persona>/<story>). What is shown is read again whenever
// the records change. "Add a source" brings in something that came in.

import { ProblemBox } from "@/components/problem-box";
import { understandHash, understandOf } from "@/lib/routes";

import { AddSource } from "./add-source";
import { PageHead } from "./bits";
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
  if (story) return <StoryLevel id={story} tint={tint} />;
  if (persona) return <PersonaLevel id={persona} tint={tint} />;
  return (
    <div className="grid content-start gap-4">
      <PageHead
        crumbs={[HOME]}
        title="Understand"
        about="The people this product is for, their stories, and where things break for them."
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
        about={`${persona.role}, and the stories we know about`}
        actions={<AddSource />}
      />
      <PersonaView page={data} tint={tint(persona.id)} />
    </div>
  );
}

function StoryLevel({
  id,
  tint,
}: Readonly<{ id: string; tint: (id: string) => string }>) {
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
        about={`A story of ${persona.name}, ${persona.role.toLowerCase()}`}
        actions={<AddSource />}
      />
      <StoryView page={data} tint={tint(persona.id)} />
    </div>
  );
}
