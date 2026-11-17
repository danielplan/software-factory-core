// Personas: the made-up people who stand for the app's customers, each
// with their kobold, where they are, whether someone on the team added them
// or they were found in how the app is used, and how many signals came from
// them. New persona adds one. A persona's page (#personas/<id>) shows who
// they are and every signal from them, whatever became of it.

import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import type { KobblePersonaPage, PersonaRow } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CARD, Chevron, Head, ROW } from "@/signals/bits";
import { countWords, originWords, personaPlaceOf } from "@/signals/view";
import { type Read, useRead } from "@/understand/use-records";

import { NewPersona } from "./new-persona";
import { SignalLine } from "./signal-line";
import { Tabs } from "./test-bits";
import { TestRun, TestsTab } from "./tests";

export function PersonasPage({ open }: Readonly<{ open: string | null }>) {
  if (!open) return <PersonaList />;
  const place = personaPlaceOf(open);
  if (place.test) return <TestRun id={place.test} />;
  return <PersonaView id={place.persona} tab={place.tab} />;
}

function PersonaList() {
  const { data, problem } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Head
        title="Personas"
        right={
          <Button
            variant="ring"
            size="pill"
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden strokeWidth={2.2} />
            New persona
          </Button>
        }
      />
      {problem && (
        <ProblemBox title="The personas cannot be read" text={problem} />
      )}
      {data && (
        <nav aria-label="Personas" className={CARD}>
          {data.personas.length === 0 && (
            <p className="p-[50px] text-center text-sm text-muted-foreground">
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
    </>
  );
}

function PersonaLine({ persona }: Readonly<{ persona: PersonaRow }>) {
  return (
    <a href={personaHash(persona.id)} className={cn(ROW, "hover:bg-surface")}>
      <PersonaFace face={persona.face} size={40} />
      <span className="grid min-w-0 flex-1">
        <span className="truncate font-semibold">{persona.name}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          {persona.place}
        </span>
      </span>
      <OriginChip origin={persona.origin} />
      <span className="w-20 text-right text-[12.5px] text-muted-foreground max-sm:hidden">
        {countWords(persona.signals, "signal", "signals")}
      </span>
      <Chevron />
    </a>
  );
}

function OriginChip({ origin }: Readonly<{ origin: PersonaRow["origin"] }>) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap max-sm:hidden",
        origin === "usage"
          ? "bg-usage text-usage-foreground"
          : "text-foreground-2 shadow-[inset_0_0_0_1px_var(--line-soft)]",
      )}
    >
      {originWords(origin)}
    </span>
  );
}

function PersonaView({
  id,
  tab,
}: Readonly<{ id: string; tab: "signals" | "tests" }>) {
  const { data, problem } = useRead(
    `/api/kobble/persona?id=${encodeURIComponent(id)}`,
  ) as Read<KobblePersonaPage>;
  return (
    <div>
      <a
        href={personaHash()}
        className="mb-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        Personas
      </a>
      {problem && (
        <ProblemBox title="This persona cannot be read" text={problem} />
      )}
      {data && <PersonaBody page={data} tab={tab} />}
    </div>
  );
}

function PersonaBody({
  page,
  tab,
}: Readonly<{ page: KobblePersonaPage; tab: "signals" | "tests" }>) {
  const { persona, signals } = page;
  return (
    <>
      <div className="mb-[22px] flex items-center gap-4">
        <PersonaFace face={persona.face} size={64} />
        <div className="grid flex-1 gap-0.5">
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.025em]">
            {persona.name}
          </h1>
          <span className="text-[12.5px] text-muted-foreground">
            {[persona.place, originWords(persona.origin).toLowerCase()]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {persona.about && (
            <p className="mt-1.5 max-w-[640px] text-foreground-2">
              {persona.about}
            </p>
          )}
        </div>
        <Button variant="ring" size="pill" disabled title="Coming later">
          <Pencil aria-hidden strokeWidth={2} className="size-[15px]" />
          Edit
        </Button>
      </div>
      <Tabs
        tabs={[
          {
            name: "Signals",
            count: signals.length,
            href: personaHash(persona.id),
            on: tab === "signals",
          },
          {
            name: "Tests",
            count: page.tests.length,
            href: personaHash(persona.id, {}),
            on: tab === "tests",
          },
        ]}
      />
      {tab === "tests" ? (
        <TestsTab page={page} />
      ) : (
        <div className={CARD}>
          {signals.length === 0 && (
            <p className="p-[50px] text-center text-sm text-muted-foreground">
              No signals from {persona.name} yet.
            </p>
          )}
          {signals.map((signal) => (
            <SignalLine key={signal.id} signal={signal} />
          ))}
        </div>
      )}
    </>
  );
}
