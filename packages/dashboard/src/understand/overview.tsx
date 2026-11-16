// Understand's first level: every persona side by side, each in a soft
// colour of their own, with the stories we know about them below; at the
// top, the kobold's line about what it did that nobody has looked at yet,
// which opens the list to move or agree with.

import { useState } from "react";

import type { PersonaCard, UnderstandOverview } from "@/api";
import { Button } from "@/components/ui/button";
import { understandHash } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { Initial, KoboldMark, Label } from "./bits";
import { SortedSignal } from "./sorted-signal";
import { StoryTile } from "./story-card";
import { useKoboldJobs } from "./use-records";
import { koboldLine, realProblemWords, storiesWords } from "./view";

export function Overview({
  overview,
  tint,
  personaName,
}: Readonly<{
  overview: UnderstandOverview;
  tint: (persona: string) => string;
  personaName: (persona: string) => string;
}>) {
  if (overview.personas.length === 0)
    return (
      <p className="rounded-2xl bg-card px-5 py-4 text-sm text-muted-foreground shadow-soft">
        No personas yet. Add a source: the kobold sorts what people say, and the
        people and their stories show up here.
      </p>
    );
  return (
    <div className="grid gap-4">
      <KoboldNews overview={overview} personaName={personaName} />
      <div className="grid items-start gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {overview.personas.map((card) => (
          <section
            key={card.persona.id}
            aria-label={card.persona.name}
            className="grid min-w-0 gap-2"
          >
            <PersonaHead card={card} tint={tint(card.persona.id)} />
            {card.stories.map((story) => (
              <StoryTile key={story.id} card={story} />
            ))}
          </section>
        ))}
      </div>
      <Legend />
    </div>
  );
}

function PersonaHead({
  card,
  tint,
}: Readonly<{ card: PersonaCard; tint: string }>) {
  const { persona } = card;
  return (
    <a
      href={understandHash(persona.id)}
      className={cn(
        "grid gap-3 rounded-2xl px-4 py-3.5 shadow-soft transition-shadow hover:shadow-md",
        tint,
      )}
    >
      <span className="flex items-center gap-2.5">
        <Initial name={persona.name} tint="bg-card" />
        <span className="grid">
          <span className="text-base font-semibold">{persona.name}</span>
          <span className="text-xs text-muted-foreground">{persona.role}</span>
        </span>
      </span>
      {persona.description && (
        <span className="text-[13px] leading-relaxed">
          {persona.description}
        </span>
      )}
      <span className="grid gap-0.5 rounded-xl bg-card/75 px-2.5 py-2">
        <Label>The real problem</Label>
        <span
          className={cn(
            "text-[13px] font-medium",
            card.realProblems.length === 0 && "text-muted-foreground",
          )}
        >
          {realProblemWords(card)}
        </span>
      </span>
      <span className="text-xs text-muted-foreground">
        {[
          storiesWords(card),
          ...persona.basedOn.slice(0, 1).map((b) => `based on ${b}`),
        ].join(" · ")}
      </span>
    </a>
  );
}

// The kobold's line, and the signals it sorted that nobody has looked at.
function KoboldNews({
  overview,
  personaName,
}: Readonly<{
  overview: UnderstandOverview;
  personaName: (persona: string) => string;
}>) {
  const [open, setOpen] = useState(false);
  const jobs = useKoboldJobs();
  const line = koboldLine(overview.kobold, personaName);
  if (!line) return null;
  const { toLookAt } = overview.kobold;
  return (
    <section
      aria-label="What the kobold did"
      className="grid gap-2 rounded-2xl bg-card px-4 py-3 shadow-soft"
    >
      <div className="flex items-center gap-3">
        <KoboldMark />
        <p className="flex-1 text-sm">{line}</p>
        {toLookAt.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? "Close" : "Look"}
          </Button>
        )}
      </div>
      {open &&
        toLookAt.map((signal) => (
          <SortedSignal
            key={signal.id}
            signal={signal}
            job={jobs.find(
              (job) => job.kind === "sort" && job.about === signal.id,
            )}
          />
        ))}
    </section>
  );
}

function Legend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="flex gap-0.5">
          <span className="size-2 rounded-[2px] bg-success" />
          <span className="size-2 rounded-[2px] bg-surface-2" />
        </span>
        scenes seen and guessed
      </span>
      <span>coloured outline: a new story</span>
      <span>dashed: assumed, from an idea</span>
      <span>crossed out: didn't hold</span>
    </p>
  );
}
