// A test's page (#testing/<test>): the persona and the story they lived,
// what the test found, then each day as a strip of moments: the time, what
// they did, the picture of the screen then, what they said, and what was
// filed at it (bug, idea, open question; or that it went fine), each
// linking to Signals. While it runs, the moment it is at; when it could not
// finish, why. Test again starts a new test for the same persona.

import { Link } from "react-router";
import { ChevronLeft, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { TestMoment, TestPage } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { CARD } from "@/components/page-bits";
import { Markdown } from "@/components/markdown";
import { useRead } from "@/api/query";
import { testPageSchema } from "@/api/schemas/testing";
import { testingPath } from "@/lib/routes";
import { testWords } from "@/lib/signals-view";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/use-t";
import { momentIn } from "@/i18n/format";

import { Found, Moment, Slider } from "./moment-card";
import { Counts, StatusIcon } from "./test-bits";

const TITLE = "mt-7 mb-3 text-[17px] font-semibold tracking-[-0.01em]";

export function TestRun({ id }: Readonly<{ id: string }>) {
  const t = useTranslation().t;
  const { data, problem } = useRead(
    `/api/kobble/testing/test?id=${encodeURIComponent(id)}`,
    testPageSchema,
  );
  return (
    <div className="min-w-0">
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
        {test.story && <Story text={test.story} />}
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

// The story's first paragraph, and the rest on Show the whole story.
function Story({ text }: Readonly<{ text: string }>) {
  const t = useTranslation().t;
  const [open, setOpen] = useState(false);
  const parts = text.trim().split(/\n\s*\n/);
  const more = parts.length > 1;
  return (
    <div className="mt-1.5 grid max-w-[640px] justify-items-start gap-1 text-foreground-2">
      <Markdown text={open ? text : (parts[0] ?? "")} />
      {more && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
          }}
          className="text-[13px] font-semibold text-blue"
        >
          {open ? t("testing.run.less") : t("testing.run.more")}
        </button>
      )}
    </div>
  );
}

// One day: its kind, what the browser reported, and its moments in a
// strip; a day after the one the persona got stuck on was not lived.
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
  const name = test.persona?.name ?? "";
  const errors = test.errors.filter((error) => error.day === number);
  const skipped = test.stuck !== null && number > test.stuck;
  return (
    <section className="relative" aria-label={t("testing.run.day", { number })}>
      <h2 className={TITLE}>
        {[t("testing.run.day", { number }), title].filter(Boolean).join(" · ")}
      </h2>
      {errors.length > 0 && (
        <details className="mb-3 text-[12.5px] text-muted-foreground">
          <summary className="cursor-pointer">
            {t("testing.run.errors")} ({errors.length})
          </summary>
          <ul className="mt-1.5 grid gap-1 pl-4">
            {errors.map((error) => (
              <li key={error.text} className="break-all">
                {error.text}
              </li>
            ))}
          </ul>
        </details>
      )}
      {skipped || moments.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">
          {skipped
            ? t("testing.run.notLived", { name, day: test.stuck })
            : t("testing.run.noMoments")}
        </p>
      ) : (
        <Slider>
          {moments.map((moment) => (
            <Moment key={moment.number} test={test.id} moment={moment} />
          ))}
        </Slider>
      )}
      {test.stuck === number && (
        <p className="mt-1 text-[13px] font-medium text-foreground-2">
          {t("testing.run.stuck", { name })}
        </p>
      )}
    </section>
  );
}
