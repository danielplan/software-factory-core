// A mission's page (a persona test): the mission, who went on it, what the
// kobold did step by step as that persona (what it expected, and whether
// that happened) and the signals it found. Missions run on this computer,
// never on the live app.

import { Link } from "react-router";
import type { TFunction } from "i18next";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PersonaTest, TestPage } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { personaPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { CARD, ROW } from "@/components/page-bits";
import { agoOf, stepWords } from "@/lib/signals-view";
import { useRead } from "@/api/query";
import { testPageSchema } from "@/api/schemas/personas";
import { Markdown } from "@/components/markdown";
import { NameTag } from "@/components/meet/name-tag";
import { testerTag } from "@/lib/meet-view";

import { SignalLine } from "./signal-line";
import { StatusChip, StatusIcon } from "./test-bits";

function whenOf(test: PersonaTest, t: TFunction): string {
  if (test.status === "queued") return t("personas.run.waitingTurn");
  return test.started ? agoOf(test.started, new Date(), t) : "";
}

export function TestRun({ id }: Readonly<{ id: string }>) {
  const t = useTranslation().t;
  const { data, problem } = useRead(
    `/api/kobble/test?id=${encodeURIComponent(id)}`,
    testPageSchema,
  );
  return (
    <div>
      {problem && (
        <ProblemBox title={t("personas.run.cannotRead")} text={problem} />
      )}
      {data && <RunBody page={data} />}
    </div>
  );
}

const TITLE = "mt-[30px] mb-3 text-[15px] font-semibold tracking-[-0.01em]";

function RunBody({ page }: Readonly<{ page: TestPage }>) {
  const t = useTranslation().t;
  const { test, persona } = page;
  const mimic = testerTag(
    { status: test.status, steps: test.steps.length },
    persona.name,
    t,
  );
  return (
    <>
      <Link
        to={personaPath(persona.id)}
        className="mb-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        {persona.name}
      </Link>
      {mimic && <NameTag id="tester" className="mb-3.5" line={mimic} />}
      <div className={cn(CARD, "px-7 py-[26px]")}>
        <div className="mb-3 flex items-center gap-2">
          <StatusChip status={test.status} />
          <span className="text-[12.5px] text-muted-foreground">
            {test.id} · {whenOf(test, t)}
          </span>
        </div>
        <h1 className="mb-3.5 text-[22px] leading-tight font-semibold tracking-[-0.015em]">
          <Markdown text={test.task} inline />
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link
            to={personaPath(persona.id)}
            className="inline-flex h-[34px] items-center gap-[7px] rounded-full bg-card pr-3.5 pl-1.5 text-[13px] font-medium text-foreground-2 shadow-card"
          >
            <PersonaFace face={persona.face} size={24} />
            {t("personas.run.as", { name: persona.name })}
          </Link>
          <span className="inline-flex h-[34px] items-center rounded-full bg-card px-3.5 text-[13px] font-medium text-foreground-2 shadow-card">
            {test.on === "main"
              ? t("personas.run.onMain")
              : t("personas.run.onPrototype")}
          </span>
        </div>
      </div>
      {test.problem && (
        <div className="mt-4">
          <ProblemBox
            title={t("personas.run.couldNotFinish")}
            text={test.problem}
          />
        </div>
      )}
      <h2 className={TITLE}>{t("personas.run.whatDid")}</h2>
      <Steps test={test} />
      <h2 className={TITLE}>
        {t("personas.run.whatFound", { name: persona.name })}
      </h2>
      <div className={CARD}>
        {page.signals.length === 0 && (
          <p className="p-[50px] text-center text-muted-foreground">
            {t("personas.run.noneYet")}
          </p>
        )}
        {page.signals.map((signal) => (
          <SignalLine
            key={signal.id}
            signal={signal}
            where={stepWords(signal, t)}
          />
        ))}
      </div>
    </>
  );
}

function Steps({ test }: Readonly<{ test: PersonaTest }>) {
  const t = useTranslation().t;
  const working = test.status === "running" || test.status === "queued";
  return (
    <div className={CARD}>
      {test.steps.map((step, at) => (
        <div key={at} className={ROW}>
          <span className="w-[18px] text-[12.5px] text-muted-foreground">
            {at + 1}
          </span>
          <span className="grid min-w-0 flex-1">
            <span className="font-medium">
              <Markdown text={step.did} inline />
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {t("personas.run.expected")}{" "}
              <Markdown text={step.expected} inline />
              {step.note && (
                <>
                  {" · "}
                  <Markdown text={step.note} inline />
                </>
              )}
            </span>
          </span>
          <span
            className={cn(
              "inline-flex h-[26px] flex-none items-center rounded-full px-2.5 text-xs font-medium",
              step.asExpected
                ? "text-foreground-2 shadow-[inset_0_0_0_1px_var(--line-soft)]"
                : "bg-[#fdecec] text-[#c4323a]",
            )}
          >
            {step.asExpected
              ? t("personas.run.asExpected")
              : t("personas.run.surprised")}
          </span>
        </div>
      ))}
      {working && (
        <div className={ROW}>
          <StatusIcon status={test.status} />
          <span className="text-[12.5px] text-muted-foreground">
            {test.status === "queued"
              ? t("personas.run.waitingForTurn")
              : (test.doing ?? t("personas.run.opening"))}
          </span>
        </div>
      )}
      {!working && test.steps.length === 0 && (
        <p className="p-[50px] text-center text-muted-foreground">
          {t("personas.run.noSteps")}
        </p>
      )}
    </div>
  );
}
