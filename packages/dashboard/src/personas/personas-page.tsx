// Personas: the made-up people who stand for the app's customers, each with
// where they are, whether someone on the team added them or they were found
// in how the app is used, and how many signals came from them. New persona
// adds one. A persona's page (#personas/<id>) shows who they are and every
// signal from them, whatever became of it.

import { ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

import type { KobblePersonaPage, PersonaRow } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { PersonaFace, SourceIcon, TypeChip } from "@/signals/bits";
import {
  agoOf,
  countWords,
  originWords,
  SOURCE_WORDS,
  statusWords,
} from "@/signals/view";
import { cn } from "@/lib/utils";
import { type Read, useRead } from "@/understand/use-records";

import { NewPersona } from "./new-persona";

export function PersonasPage({ open }: Readonly<{ open: string | null }>) {
  return open ? <PersonaView id={open} /> : <PersonaList />;
}

function PersonaList() {
  const { data, problem } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid content-start gap-4">
      <PageHead
        title="Personas"
        about="The people who use the app, anonymised. Each one stands for some of its customers."
        actions={
          <Button
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden />
            New persona
          </Button>
        }
      />
      {problem && (
        <ProblemBox title="The personas cannot be read" text={problem} />
      )}
      {data && (
        <nav
          aria-label="Personas"
          className="grid overflow-hidden rounded-2xl bg-card shadow-soft"
        >
          {data.personas.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No personas yet. Add the first: New persona.
            </p>
          )}
          {data.personas.map((persona) => (
            <PersonaLine key={persona.id} persona={persona} />
          ))}
        </nav>
      )}
      <NewPersona
        open={adding}
        onClose={() => {
          setAdding(false);
        }}
      />
    </div>
  );
}

function PersonaLine({ persona }: Readonly<{ persona: PersonaRow }>) {
  return (
    <a
      href={personaHash(persona.id)}
      className="flex items-center gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0 hover:bg-surface"
    >
      <PersonaFace id={persona.id} name={persona.name} />
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-semibold">{persona.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {persona.place}
        </span>
      </span>
      <OriginChip origin={persona.origin} />
      <span className="w-20 text-right text-xs text-muted-foreground max-sm:hidden">
        {countWords(persona.signals, "signal", "signals")}
      </span>
      <ChevronRight aria-hidden className="size-4 flex-none text-faint" />
    </a>
  );
}

function OriginChip({ origin }: Readonly<{ origin: PersonaRow["origin"] }>) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        origin === "usage"
          ? "bg-solved text-solved-foreground"
          : "text-foreground-2 shadow-soft",
      )}
    >
      {originWords(origin)}
    </span>
  );
}

function PersonaView({ id }: Readonly<{ id: string }>) {
  const { data, problem } = useRead(
    `/api/kobble/persona?id=${encodeURIComponent(id)}`,
  ) as Read<KobblePersonaPage>;
  const now = new Date();
  return (
    <div className="grid content-start gap-4">
      <PageHead
        crumbs={[
          { name: "Personas", href: personaHash() },
          { name: data?.persona.name ?? id },
        ]}
        title={data?.persona.name ?? ""}
      />
      {problem && (
        <ProblemBox title="This persona cannot be read" text={problem} />
      )}
      {data && (
        <>
          <section
            aria-label="Who they are"
            className="flex items-start gap-4 rounded-2xl bg-card px-6 py-5 shadow-soft"
          >
            <PersonaFace id={data.persona.id} name={data.persona.name} big />
            <span className="grid gap-1">
              <span className="text-sm text-muted-foreground">
                {[data.persona.place, originWords(data.persona.origin)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {data.persona.about && (
                <p className="max-w-[640px] text-sm leading-relaxed">
                  {data.persona.about}
                </p>
              )}
            </span>
          </section>
          <h2 className="px-1 text-sm font-medium text-muted-foreground">
            Signals · {String(data.signals.length)}
          </h2>
          <div className="grid overflow-hidden rounded-2xl bg-card shadow-soft">
            {data.signals.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No signals from {data.persona.name} yet.
              </p>
            )}
            {data.signals.map((signal) => (
              <div
                key={signal.id}
                className="flex items-start gap-3 border-t border-border-soft px-5 py-3.5 first:border-t-0"
              >
                <SourceIcon source={signal.source} />
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span className="text-sm">{signal.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {SOURCE_WORDS[signal.source]} · {agoOf(signal.at, now)} ·{" "}
                    {statusWords(signal)}
                  </span>
                </span>
                <TypeChip type={signal.type} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
