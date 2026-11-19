// Personas: the made-up people who stand for the app's customers, each
// with their kobold, where they are, whether someone on the team added them
// or they were found in how the app is used, and how many signals came from
// them. Send everyone sends each on the mission the kobold suggests; New
// persona asks the support kobold, who adds one with the team. A persona's
// page (#personas/<id>) shows who they are, Send on a mission and their
// missions (missions.tsx), and every signal from them, whatever became of
// it. A mission's own page is #personas/<id>/tests/<mission>.

import { ChevronLeft, Pencil, Plus } from "lucide-react";

import type { Face, KobblePersonaPage, PersonaRow } from "@/api";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CARD, Head } from "@/signals/bits";
import { originWords, personaPlaceOf } from "@/signals/view";
import { type Read, useRead } from "@/lib/use-read";
import { Markdown } from "@/components/markdown";
import { askSupport } from "@/support/ask-support";

import { PersonaMissions } from "./missions";
import { SendEveryone } from "./send-everyone";
import { SignalLine } from "./signal-line";
import { TestRun } from "./tests";

export function PersonasPage({ open }: Readonly<{ open: string | null }>) {
  if (!open) return <PersonaList />;
  const place = personaPlaceOf(open);
  if (place.test) return <TestRun id={place.test} />;
  return <PersonaView id={place.persona} />;
}

function PersonaList() {
  const { data, problem } = useRead("/api/kobble/personas") as Read<{
    personas: PersonaRow[];
  }>;
  const adding = () => {
    askSupport("I'd like to add a new persona.");
  };
  return (
    <>
      <Head
        title="Personas"
        right={
          <>
            {data && data.personas.length > 0 && (
              <SendEveryone personas={data.personas} />
            )}
            <Button
              variant={data?.personas.length === 0 ? "default" : "ring"}
              size="pill"
              onClick={adding}
            >
              <Plus aria-hidden strokeWidth={2.2} />
              New persona
            </Button>
          </>
        }
      />
      {problem && (
        <ProblemBox title="The personas cannot be read" text={problem} />
      )}
      {data && data.personas.length === 0 && <NoPersonas onNew={adding} />}
      {data && data.personas.length > 0 && (
        <nav
          aria-label="Personas"
          className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {data.personas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} />
          ))}
        </nav>
      )}
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
        Tell the kobold about the people who use your app, in a few words each.
        Once Kobble reads your live app, the kobold also suggests personas from
        how people use it.
      </p>
      <Button size="pill" className="mt-2" onClick={onNew}>
        <Plus aria-hidden strokeWidth={2.2} />
        New persona
      </Button>
    </div>
  );
}

// A persona's card: who they are, read only, and a quiet line while they
// are on a mission. The whole card opens the persona's page.
function PersonaCard({ persona }: Readonly<{ persona: PersonaRow }>) {
  return (
    <a
      href={personaHash(persona.id)}
      className={cn(
        CARD,
        "group flex flex-col gap-3 px-5 py-4 transition-shadow hover:shadow-md",
      )}
    >
      <span className="flex items-center gap-3">
        <PersonaFace face={persona.face} size={44} />
        <span className="grid min-w-0 gap-0.5">
          <span className="truncate font-semibold group-hover:underline">
            {persona.name}
          </span>
          {persona.place && (
            <span className="truncate text-[12.5px] text-muted-foreground">
              {persona.place}
            </span>
          )}
        </span>
      </span>
      <span className="line-clamp-3 text-[14px] leading-normal text-foreground-2">
        {persona.about ? (
          <Markdown text={persona.about} inline />
        ) : (
          <span className="text-muted-foreground">No description yet.</span>
        )}
      </span>
      {persona.onMission && (
        <span className="text-[12.5px] font-semibold text-blue">
          On a mission
        </span>
      )}
    </a>
  );
}

function PersonaView({ id }: Readonly<{ id: string }>) {
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
      {data && <PersonaBody page={data} />}
    </div>
  );
}

// Who the persona is, their missions, and, once there are any (after
// launch), the signals from real customers like them.
function PersonaBody({ page }: Readonly<{ page: KobblePersonaPage }>) {
  const { persona } = page;
  const customers = page.signals.filter((signal) => signal.source !== "test");
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
      <PersonaMissions page={page} />
      {customers.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em]">
            From real customers
          </h2>
          <div className={CARD}>
            {customers.map((signal) => (
              <SignalLine key={signal.id} signal={signal} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
