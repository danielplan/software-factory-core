// Personas: the made-up people who stand for the app's customers, each
// with their kobold, where they are, whether someone on the team added them
// or they were found in how the app is used, and how many signals came from
// them. Send everyone sends each on the mission the kobold suggests; New
// persona asks the support kobold, who adds one with the team. A persona's
// page (#personas/<id>) shows who they are, Send on a mission and their
// missions (missions.tsx), and every signal from them, whatever became of
// it. A mission's own page is #personas/<id>/tests/<mission>.

import { ChevronLeft, Pencil, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Face, KobblePersonaPage, PersonaRow } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { personaHash } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CARD, Head } from "@/components/page-bits";
import { originWords, personaPlaceOf } from "@/lib/signals-view";
import { useRead } from "@/api/query";
import { personaPageSchema, personasSchema } from "@/api/schemas/personas";
import { Markdown } from "@/components/markdown";
import { askSupport } from "@/lib/ask-support";

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
  const t = useTranslation().t;
  const { data, problem } = useRead("/api/kobble/personas", personasSchema);
  const adding = () => {
    askSupport(t("personas.askNew"));
  };
  return (
    <>
      <Head
        title={t("shell.pages.personas")}
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
              {t("personas.newPersona")}
            </Button>
          </>
        }
      />
      {problem && (
        <ProblemBox title={t("personas.cannotRead")} text={problem} />
      )}
      {data && data.personas.length === 0 && <NoPersonas onNew={adding} />}
      {data && data.personas.length > 0 && (
        <nav
          aria-label={t("shell.pages.personas")}
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
  const t = useTranslation().t;
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
      <div className="text-base font-semibold">{t("personas.whoFor")}</div>
      <p className="max-w-[460px] text-[14.5px] text-foreground-2">
        {t("personas.whoForText")}
      </p>
      <Button size="pill" className="mt-2" onClick={onNew}>
        <Plus aria-hidden strokeWidth={2.2} />
        {t("personas.newPersona")}
      </Button>
    </div>
  );
}

// A persona's card: who they are, read only, and a quiet line while they
// are on a mission. The whole card opens the persona's page.
function PersonaCard({ persona }: Readonly<{ persona: PersonaRow }>) {
  const t = useTranslation().t;
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
          <span className="text-muted-foreground">
            {t("personas.noDescription")}
          </span>
        )}
      </span>
      {persona.onMission && (
        <span className="text-[12.5px] font-semibold text-blue">
          {t("personas.onMission")}
        </span>
      )}
    </a>
  );
}

function PersonaView({ id }: Readonly<{ id: string }>) {
  const t = useTranslation().t;
  const { data, problem } = useRead(
    `/api/kobble/persona?id=${encodeURIComponent(id)}`,
    personaPageSchema,
  );
  return (
    <div>
      <a
        href={personaHash()}
        className="mb-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        {t("shell.pages.personas")}
      </a>
      {problem && (
        <ProblemBox title={t("personas.oneCannotRead")} text={problem} />
      )}
      {data && <PersonaBody page={data} />}
    </div>
  );
}

// Who the persona is, their missions, and, once there are any (after
// launch), the signals from real customers like them.
function PersonaBody({ page }: Readonly<{ page: KobblePersonaPage }>) {
  const t = useTranslation().t;
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
            {[persona.place, originWords(persona.origin, t).toLowerCase()]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {persona.about && (
            <div className="mt-1.5 max-w-[640px] text-foreground-2">
              <Markdown text={persona.about} />
            </div>
          )}
        </div>
        <Button
          variant="ring"
          size="pill"
          disabled
          title={t("personas.comingLater")}
        >
          <Pencil aria-hidden strokeWidth={2} className="size-[15px]" />
          {t("personas.edit")}
        </Button>
      </div>
      <PersonaMissions page={page} />
      {customers.length > 0 && (
        <>
          <h2 className="mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em]">
            {t("personas.fromCustomers")}
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
