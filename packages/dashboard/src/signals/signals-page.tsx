// Signals (#signals, #signals/<signal>): what people said that nobody has
// looked at yet, one at a time, in a big card: fix it, explore it or
// dismiss it, and the next one shows. "3 of 14" and the arrows (or ← and →)
// go through them. At the top, a way to add what people said and to ask
// the kobold for a check-up.

import { ChevronLeft, ChevronRight, Stethoscope } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { KoboldNews } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { understandHash } from "@/lib/routes";
import { AddSource } from "@/understand/add-source";
import { KoboldMark } from "@/understand/bits";
import { useKoboldJobs, useOverview } from "@/understand/use-records";
import { tintOf } from "@/understand/view";

import { SignalDetail } from "./signal-detail";
import { idFrom, neighbours, type Shown, shownOf, signalsHash } from "./view";

export function SignalsPage({ open }: Readonly<{ open: string | null }>) {
  const { t } = useTranslation("understand");
  const { data, problem } = useOverview();
  const jobs = useKoboldJobs();
  const signals = data?.kobold.toLookAt ?? [];
  const ids = signals.map((signal) => signal.id);
  const shown = useShown(ids, open);
  const signal = signals.find((one) => one.id === shown);
  const order = data?.personas.map((card) => card.persona.id) ?? [];
  const tint = (id: string) => tintOf(Math.max(order.indexOf(id), 0));
  return (
    <div className="grid content-start gap-5">
      <PageHead
        title={t("signals.title")}
        actions={
          <>
            <Button asChild variant="ghost">
              <a href="#checks">
                <Stethoscope aria-hidden />
                <span className="max-md:sr-only">{t("signals.checkup")}</span>
              </a>
            </Button>
            <AddSource />
          </>
        }
      >
        {ids.length > 0 && <Steps ids={ids} shown={shown} />}
      </PageHead>
      {problem && <ProblemBox title={t("page.cantRead")} text={problem} />}
      {data && (
        <NewStory
          news={data.kobold}
          nameOf={(id) =>
            data.personas.find((card) => card.persona.id === id)?.persona
              .name ?? id
          }
        />
      )}
      {data && !signal && <CaughtUp />}
      {signal && (
        <SignalDetail
          signal={signal}
          tint={tint}
          job={jobs.find(
            (job) => job.kind === "sort" && job.about === signal.id,
          )}
        />
      )}
    </div>
  );
}

// The signal shown. What was shown before is kept as React keeps
// information from the last render: so a signal handled (gone from the
// list) gives way to the next.
function useShown(ids: string[], open: string | null): string | null {
  const [before, setBefore] = useState<Shown>({ ids: [], shown: null });
  const shown = shownOf(before, ids, idFrom(open));
  if (before.shown !== shown || before.ids.join("\n") !== ids.join("\n"))
    setBefore({ ids, shown });
  return shown;
}

// "3 of 14", with arrows (and ← →) to the one before and after.
function Steps({
  ids,
  shown,
}: Readonly<{ ids: string[]; shown: string | null }>) {
  const { t } = useTranslation("understand");
  const { at, before, after } = neighbours(ids, shown);
  useEffect(() => {
    const go = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      const to = { ArrowLeft: before, ArrowRight: after }[event.key];
      if (to) window.location.hash = signalsHash(to);
    };
    window.addEventListener("keydown", go);
    return () => {
      window.removeEventListener("keydown", go);
    };
  }, [before, after]);
  return (
    <span className="ml-auto flex items-center gap-1 text-note text-muted-foreground">
      <span className="tabular-nums">
        {t("signals.of", { n: at + 1, total: ids.length })}
      </span>
      <Arrow to={before} label={t("signals.previous")}>
        <ChevronLeft aria-hidden />
      </Arrow>
      <Arrow to={after} label={t("signals.next")}>
        <ChevronRight aria-hidden />
      </Arrow>
    </span>
  );
}

function Arrow({
  to,
  label,
  children,
}: Readonly<{ to: string | null; label: string; children: ReactNode }>) {
  if (!to)
    return (
      <Button variant="ghost" size="icon" disabled aria-label={label}>
        {children}
      </Button>
    );
  return (
    <Button asChild variant="ghost" size="icon">
      <a href={signalsHash(to)} aria-label={label}>
        {children}
      </a>
    </Button>
  );
}

// A story the kobold wrote that nobody has looked at, in one quiet line.
function NewStory({
  news,
  nameOf,
}: Readonly<{ news: KoboldNews; nameOf: (persona: string) => string }>) {
  const { t } = useTranslation("understand");
  const [story] = news.newStories;
  if (!story) return null;
  return (
    <a
      href={understandHash(story.persona, story.id)}
      className="flex w-full max-w-2xl items-center gap-2 justify-self-center text-note text-muted-foreground transition-colors hover:text-foreground"
    >
      <KoboldMark className="size-5" />
      {t("signals.newStory", {
        name: nameOf(story.persona),
        title: story.title,
      })}
      <ChevronRight aria-hidden className="size-3.5" />
    </a>
  );
}

function CaughtUp() {
  const { t } = useTranslation("understand");
  return (
    <div className="grid justify-items-center gap-3 py-16 text-center">
      <KoboldMark className="size-16" />
      <p className="text-body text-muted-foreground">{t("signals.empty")}</p>
    </div>
  );
}
