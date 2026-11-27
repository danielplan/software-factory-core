// A test's page (#testing/<test>): the persona and the story they lived,
// what the test found, then each day as a strip of moments: the time, what
// they did, the picture of the screen then, what they said, and what was
// filed at it (bug, idea, open question; or that it went fine), each
// linking to Signals. While it runs, the moment it is at; when it could not
// finish, why. Test again starts a new test for the same persona.

import { Link } from "react-router";
import { ChevronLeft, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Face, SignalRow, TestMoment, TestPage } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { CARD, TypeChip } from "@/components/page-bits";
import { Markdown } from "@/components/markdown";
import { useRead } from "@/api/query";
import { testPageSchema } from "@/api/schemas/testing";
import { testingPath } from "@/lib/routes";
import { testWords } from "@/lib/signals-view";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/use-t";
import { momentIn } from "@/i18n/format";

import { CountChip, Counts, StatusIcon } from "./test-bits";

const TITLE = "mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em]";

export function TestRun({ id }: Readonly<{ id: string }>) {
  const t = useTranslation().t;
  const { data, problem } = useRead(
    `/api/kobble/testing/test?id=${encodeURIComponent(id)}`,
    testPageSchema,
  );
  return (
    <div>
      <Link
        to={testingPath()}
        className="mb-3.5 inline-flex items-center gap-1 text-[13px] font-semibold text-blue"
      >
        <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
        {t("shell.pages.testing")}
      </Link>
      {problem && (
        <ProblemBox title={t("testing.run.cannotRead")} text={problem} />
      )}
      {data && <RunBody page={data} />}
    </div>
  );
}

type Test = TestPage["test"];

function RunBody({ page }: Readonly<{ page: TestPage }>) {
  const t = useTranslation().t;
  const { test } = page;
  return (
    <>
      <RunHead test={test} />
      {test.problem && (
        <ProblemBox
          title={t("testing.run.couldNotFinish")}
          text={test.problem}
        />
      )}
      <Going test={test} />
      {test.dayTitles.map((title, at) => (
        <Day
          key={at}
          test={test}
          number={at + 1}
          title={title}
          moments={page.moments.filter((moment) => moment.day === at + 1)}
        />
      ))}
      {page.other.length > 0 && (
        <>
          <h2 className={TITLE}>{t("testing.run.whole")}</h2>
          <div className={cn(CARD, "grid gap-2 px-5 py-4")}>
            {page.other.map((signal) => (
              <Found key={signal.id} signal={signal} />
            ))}
          </div>
        </>
      )}
      {test.status === "done" && (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {t("testing.run.inSignals")}
        </p>
      )}
    </>
  );
}

const going = (test: Test) =>
  test.status === "queued" || test.status === "running";

// The persona's face, the test's name, who and when, the story, what it
// found; Test again once it is over.
function RunHead({ test }: Readonly<{ test: Test }>) {
  const t = useTranslation().t;
  const locale = useLocale();
  const when = test.started ?? test.ended;
  const { persona } = test;
  return (
    <div className="mb-[22px] flex flex-wrap items-center gap-4">
      {persona && <PersonaFace face={persona.face} size={64} />}
      <div className="grid min-w-0 flex-1 gap-0.5">
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
          {test.title}
        </h1>
        <span className="text-[12.5px] text-muted-foreground">
          {t("testing.run.on", {
            place: [persona?.name, persona?.place].filter(Boolean).join(" · "),
            when: when ? momentIn(locale, when) : "",
            on:
              test.on === "main"
                ? t("testing.row.onMain")
                : t("testing.row.onPrototype"),
          })}
        </span>
        {test.story && (
          <div className="mt-1.5 max-w-[640px] text-foreground-2">
            <Markdown text={test.story} />
          </div>
        )}
        <div className="mt-2">
          <Counts test={test} fine />
        </div>
      </div>
      {persona && !going(test) && (
        <Button asChild variant="ring" size="pill">
          <Link to={testingPath({ new: persona.id })}>
            <Send aria-hidden strokeWidth={2} className="size-[15px]" />
            {t("testing.run.again", { name: persona.name })}
          </Link>
        </Button>
      )}
    </div>
  );
}

// While it runs or waits: the moment it is at.
function Going({ test }: Readonly<{ test: Test }>) {
  const t = useTranslation().t;
  if (!going(test)) return null;
  return (
    <p
      aria-live="polite"
      className={cn(
        CARD,
        "flex items-center gap-2.5 px-5 py-3 text-[13px] text-foreground-2",
      )}
    >
      <StatusIcon status={test.status} />
      {test.status === "queued" ? t("testing.run.waiting") : testWords(test, t)}
    </p>
  );
}

// One day: its kind, and its moments in a strip.
function Day({
  test,
  number,
  title,
  moments,
}: Readonly<{
  test: Test;
  number: number;
  title: string;
  moments: TestMoment[];
}>) {
  const t = useTranslation().t;
  return (
    <section aria-label={t("testing.run.day", { number })}>
      <h2 className={TITLE}>
        {[t("testing.run.day", { number }), title].filter(Boolean).join(" · ")}
      </h2>
      {moments.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          {t("testing.run.noMoments")}
        </p>
      ) : (
        <div className="flex snap-x gap-3 overflow-x-auto px-0.5 pt-0.5 pb-3">
          {moments.map((moment) => (
            <Moment
              key={moment.number}
              test={test.id}
              moment={moment}
              face={test.persona?.face ?? null}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Moment({
  test,
  moment,
  face,
}: Readonly<{
  test: string;
  moment: TestMoment;
  face: Face | null;
}>) {
  const t = useTranslation().t;
  const bug = moment.signals.some((signal) => signal.type === "bug");
  return (
    <article
      className={cn(
        CARD,
        "flex w-[280px] flex-none snap-start flex-col",
        bug &&
          "shadow-[0_0_0_1px_color-mix(in_srgb,var(--type-bug)_35%,var(--border))]",
      )}
    >
      <div className="flex items-baseline justify-between gap-2 px-4 pt-3 pb-2">
        <span className="font-semibold">
          {moment.time ?? `#${String(moment.number)}`}
        </span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          {moment.did}
        </span>
      </div>
      {moment.shot ? (
        <img
          src={`/api/kobble/testing/shot?id=${encodeURIComponent(test)}&name=${encodeURIComponent(moment.shot)}`}
          alt={moment.did}
          className="h-[150px] w-full border-y border-line-soft object-cover object-top-left"
        />
      ) : (
        <div className="h-[150px] w-full border-y border-line-soft bg-surface" />
      )}
      <div className="flex items-end gap-2 px-4 pt-3">
        {face && <PersonaFace face={face} size={26} />}
        <p className="rounded-[12px_12px_12px_4px] bg-surface-2 px-[11px] py-2 text-[13px] leading-snug">
          {moment.note ?? t("testing.run.expected", { what: moment.expected })}
        </p>
      </div>
      <div className="grid gap-1.5 px-4 pt-3 pb-4">
        {moment.signals.length === 0 ? (
          <span>
            <CountChip kind="ok">{t("testing.moment.ok")}</CountChip>
          </span>
        ) : (
          moment.signals.map((signal) => (
            <Found key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </article>
  );
}

function Found({ signal }: Readonly<{ signal: SignalRow }>) {
  return (
    <Link
      to={`/signals/${encodeURIComponent(signal.id)}`}
      className="group -mx-1 flex items-start gap-2 rounded-[8px] px-1 py-0.5 text-[12.5px] text-foreground-2 hover:bg-surface"
    >
      <TypeChip type={signal.type} />
      <span className="group-hover:underline">
        <Markdown text={signal.text} inline />
      </span>
    </Link>
  );
}
