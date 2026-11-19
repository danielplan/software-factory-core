// Personas: the made-up people who stand for the app's customers, each
// with their kobold, where they are, whether someone on the team added them
// or they were found in how the app is used, and how many signals came from
// them. New persona adds one. A persona's page (#personas/<id>) shows who
// they are and every signal from them, whatever became of it.

import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import type { Face, KobblePersonaPage, PersonaRow } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CARD, Chevron, Head, ROW } from "@/signals/bits";
import { countWords, originWords, personaPlaceOf } from "@/signals/view";
import { type Read, useRead } from "@/lib/use-read";
import { Markdown } from "@/components/markdown";

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
            variant={data?.personas.length === 0 ? "default" : "ring"}
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
      {data && data.personas.length === 0 && (
        <NoPersonas
          onNew={() => {
            setAdding(true);
          }}
        />
      )}
      {data && data.personas.length > 0 && (
        <nav aria-label="Personas" className={CARD}>
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

const FACES: { face: Face; fade: number }[] = [
  { face: { hat: "phones", color: "pink" }, fade: 0.5 },
  { face: { hat: "toque", color: "amber" }, fade: 0.8 },
  { face: { hat: "cap", color: "blue" }, fade: 1 },
  { face: { hat: "beret", color: "teal" }, fade: 0.65 },
];

// Before there is any persona: a few faces, what personas are for, and
// New persona.
function NoPersonas({ onNew }: Readonly<{ onNew: () => void }>) {
  return (
    <div
      className={cn(
        CARD,
        "flex flex-col items-center gap-3 px-7 py-12 text-center",
      )}
    >
      <div className="mb-1.5 flex gap-2.5">
        {FACES.map(({ face, fade }) => (
          <span key={face.hat} style={{ opacity: fade }}>
            <PersonaFace face={face} size={56} />
          </span>
        ))}
      </div>
      <div className="text-base font-semibold">Who are you building for?</div>
      <p className="max-w-[460px] text-[14.5px] text-foreground-2">
        Add the people who use your app, in a few words each. Once Kobble reads
        your live app, the kobold also suggests personas from how people use it.
      </p>
      <Button size="pill" className="mt-2" onClick={onNew}>
        <Plus aria-hidden strokeWidth={2.2} />
        New persona
      </Button>
    </div>
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
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
            {persona.name}
          </h1>
          <span className="text-[12.5px] text-muted-foreground">
            {[persona.place, originWords(persona.origin).toLowerCase()]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {persona.about && (
            <div className="mt-1.5 max-w-[640px] text-foreground-2">
              <Markdown text={persona.about} />
            </div>
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
            name: "Signals on this computer",
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
            <p className="p-[50px] text-center text-[13px] text-muted-foreground">
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
