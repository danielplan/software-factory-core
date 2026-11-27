// A new test (#testing/new, or #testing/new/<persona>): pick who, and
// Mimic writes their story and their days, marked as written by Mimic; the
// team changes anything (the name, the story, each day's kind and what
// happens in it, one line each; a day more or less), then sends them off.
// Mimic's story is asked for once per persona while the page is open, not
// each time Kobble's files change.

import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TestPersona } from "@/api/client";
import { KoboldHead, PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { CARD } from "@/components/page-bits";
import { useRead } from "@/api/query";
import { testsSchema } from "@/api/schemas/testing";
import { testingPath } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { mimic, StoryForm, TITLE, useDraft } from "./story-form";

export function NewTest({ persona }: Readonly<{ persona: string | null }>) {
  const t = useTranslation().t;
  const { data, problem } = useRead("/api/kobble/testing", testsSchema);
  const [picked, setPicked] = useState<string | null>(persona);
  const who = picked ?? data?.personas[0]?.id ?? null;
  const person = data?.personas.find((one) => one.id === who) ?? null;
  return (
    <div>
      <Link
        to={testingPath()}
        className="mb-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        {t("shell.pages.testing")}
      </Link>
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
        {t("testing.newTest")}
      </h1>
      <p className="mt-1 text-[14px] text-muted-foreground">
        {t("testing.new.line")}
      </p>
      {problem && <ProblemBox title={t("testing.cannotRead")} text={problem} />}
      {data && (
        <>
          <h2 className={TITLE}>{t("testing.new.who")}</h2>
          <div
            role="radiogroup"
            aria-label={t("testing.new.who")}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {data.personas.map((one) => (
              <PersonaChoice
                key={one.id}
                persona={one}
                picked={one.id === who}
                onPick={() => {
                  setPicked(one.id);
                }}
              />
            ))}
          </div>
        </>
      )}
      {person && <Story key={person.id} persona={person} />}
    </div>
  );
}

function PersonaChoice({
  persona,
  picked,
  onPick,
}: Readonly<{ persona: TestPersona; picked: boolean; onPick: () => void }>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={picked}
      onClick={onPick}
      className={cn(
        "flex items-center gap-3 overflow-hidden rounded-xl bg-card px-4 py-3 text-left transition-shadow",
        // The card's own shadow would hide the ring, so a picked one has
        // only the ring.
        picked
          ? "shadow-[0_0_0_2px_var(--blue)]"
          : "shadow-card hover:shadow-md",
      )}
    >
      <PersonaFace face={persona.face} size={44} />
      <span className="grid min-w-0 gap-0.5">
        <span className="truncate font-semibold">{persona.name}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          {persona.place}
        </span>
      </span>
    </button>
  );
}

// The story and the days for one persona: Mimic's, then the team's.
function Story({ persona }: Readonly<{ persona: TestPersona }>) {
  const t = useTranslation().t;
  const draft = useDraft(persona.id);
  const { written } = draft;
  if (!written)
    return (
      <section
        className={cn(CARD, "mt-7 grid gap-3 px-6 py-5")}
        aria-live="polite"
      >
        {draft.problem ? (
          <p role="alert" className="text-[13px] text-destructive">
            {draft.problem}{" "}
            <button
              type="button"
              onClick={draft.again}
              className="font-semibold text-blue"
            >
              {t("testing.new.tryAgain")}
            </button>
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
            <KoboldHead size={22} hat={mimic?.hat} color={mimic?.color} />
            {t("testing.new.writing", { name: persona.name })}
          </p>
        )}
      </section>
    );
  return (
    <StoryForm persona={persona} written={written} onChange={draft.change} />
  );
}
