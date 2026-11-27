// Testing: the tests so far, newest first, each with its persona, how many
// days, how its moments went and what it found; New test opens the new
// test (new-test.tsx). With no test yet: the personas as cards to pick one
// from. A test's own page is #testing/<test> (test-run.tsx).

import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { TestPersona, TestRow } from "@/api/client";
import { PersonaFace } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { CARD, Head } from "@/components/page-bits";
import { useRead } from "@/api/query";
import { testsSchema } from "@/api/schemas/testing";
import { personaPath, testingPath } from "@/lib/routes";
import { testWords } from "@/lib/signals-view";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/use-t";
import { momentIn } from "@/i18n/format";

import { NewTest } from "./new-test";
import { TestRun } from "./test-run";
import { Counts, MomentBars, StatusIcon } from "./test-bits";

export function TestingPage({ open }: Readonly<{ open: string | null }>) {
  if (!open) return <TestList />;
  const [first = "", persona] = open
    .split("/")
    .map((part) => decodeURIComponent(part));
  if (first === "new") return <NewTest persona={persona ?? null} />;
  return <TestRun id={first} />;
}

function TestList() {
  const t = useTranslation().t;
  const go = useNavigate();
  const { data, problem } = useRead("/api/kobble/testing", testsSchema);
  const none = data?.tests.length === 0;
  return (
    <>
      <Head
        title={t("shell.pages.testing")}
        right={
          !none && (
            <Button
              size="pill"
              onClick={() => {
                void go(testingPath({ new: null }));
              }}
            >
              <Plus aria-hidden strokeWidth={2.2} />
              {t("testing.newTest")}
            </Button>
          )
        }
      />
      {problem && <ProblemBox title={t("testing.cannotRead")} text={problem} />}
      {data && none && <NoTests personas={data.personas} />}
      {data && !none && (
        <nav aria-label={t("shell.pages.testing")} className="mt-3 grid gap-3">
          {data.tests.map((test) => (
            <TestCard key={test.id} test={test} />
          ))}
        </nav>
      )}
    </>
  );
}

// The line under a test's title: when and how many days, or what it is
// doing now, or why it stopped.
function lineOf(
  test: TestRow,
  t: TFunction,
  locale: ReturnType<typeof useLocale>,
): string {
  if (test.status === "queued" || test.status === "running")
    return testWords(test, t);
  if (test.status === "failed")
    return t("testing.row.stopped", {
      why: test.problem ?? t("testing.row.noReason"),
    });
  const when = test.started ?? test.ended;
  return [
    when ? momentIn(locale, when) : null,
    t("testing.row.days", { count: test.days }),
    test.on === "main" ? t("testing.row.onMain") : t("testing.row.onPrototype"),
  ]
    .filter(Boolean)
    .join(" · ");
}

function TestCard({ test }: Readonly<{ test: TestRow }>) {
  const t = useTranslation().t;
  const locale = useLocale();
  const going = test.status === "queued" || test.status === "running";
  const found = test.counts.bug + test.counts.idea + test.counts.question;
  return (
    <Link
      to={testingPath({ test: test.id })}
      className={cn(
        CARD,
        "group flex flex-wrap items-center gap-4 px-5 py-4 transition-shadow hover:shadow-md",
      )}
    >
      {test.persona && <PersonaFace face={test.persona.face} size={44} />}
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-semibold group-hover:underline">
          {test.title}
        </span>
        <span
          aria-live={going ? "polite" : undefined}
          className={cn(
            "flex items-center gap-1.5 truncate text-[12.5px]",
            going ? "font-medium text-blue" : "text-muted-foreground",
          )}
        >
          {going && <StatusIcon status={test.status} size={12} />}
          {lineOf(test, t, locale)}
        </span>
      </span>
      <MomentBars moments={test.moments} />
      {test.status === "done" && found === 0 ? (
        <span className="text-[12.5px] text-muted-foreground">
          {t("testing.row.nothing")}
        </span>
      ) : (
        <Counts test={test} />
      )}
    </Link>
  );
}

// No test yet: the personas' faces beside a plain app screen, one
// sentence, and the personas to pick one from; with no persona, a way to
// Personas first.
function NoTests({ personas }: Readonly<{ personas: TestPersona[] }>) {
  const t = useTranslation().t;
  return (
    <div
      className={cn(
        CARD,
        "flex flex-col items-center gap-3 px-6 pt-10 pb-12 text-center",
      )}
    >
      <div aria-hidden className="flex -space-x-1.5">
        {personas.slice(0, 4).map((persona) => (
          <PersonaFace
            key={persona.id}
            face={persona.face}
            size={44}
            className="rounded-[12px] ring-2 ring-card"
          />
        ))}
      </div>
      <p className="mt-2 max-w-[420px] text-[15.5px] text-foreground-2">
        {personas.length > 0 ? t("testing.empty") : t("testing.noPersonas")}
      </p>
      {personas.length === 0 && (
        <Button asChild size="pill" className="mt-1.5">
          <Link to={personaPath()}>{t("testing.addPersonas")}</Link>
        </Button>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {personas.map((persona) => (
          <Link
            key={persona.id}
            to={testingPath({ new: persona.id })}
            className={cn(
              CARD,
              "flex items-center gap-3 px-4 py-3 text-left transition-shadow hover:shadow-md",
            )}
          >
            <PersonaFace face={persona.face} size={44} />
            <span className="grid min-w-0 gap-0.5">
              <span className="truncate font-semibold">{persona.name}</span>
              <span className="truncate text-[12.5px] text-muted-foreground">
                {persona.place}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
