// Signals (#signals, #signals/<signal>): what people said that nobody has
// looked at yet, on a board like Factory's, in three columns by kind: Bugs,
// Requests and Feedback. Each card can be fixed, explored or dismissed right
// there; pressing it opens it in full in a dialog (its address names it).
// At the top, a way to add what people said and to ask the kobold for a
// check-up; above the board, a story the kobold wrote, if any.

import {
  Bug,
  ChevronRight,
  Lightbulb,
  MessageCircle,
  Stethoscope,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { KoboldNews, SignalView } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { understandHash } from "@/lib/routes";
import { useDownToTheEnd } from "@/lib/use-down-to-the-end";
import { cn } from "@/lib/utils";
import { AddSource } from "@/understand/add-source";
import { KoboldMark } from "@/understand/bits";
import { useKoboldJobs, useOverview } from "@/understand/use-records";
import { tintOf } from "@/understand/view";

import { SignalCard } from "./signal-card";
import { SignalDetail } from "./signal-detail";
import {
  byColumn,
  type Column,
  COLUMNS,
  idFrom,
  quoted,
  signalsHash,
} from "./view";

const ICONS: Record<Column, ReactNode> = {
  bugs: <Bug aria-hidden className="text-destructive" />,
  requests: <Lightbulb aria-hidden className="text-primary" />,
  feedback: <MessageCircle aria-hidden className="text-explore" />,
};

export function SignalsPage({ open }: Readonly<{ open: string | null }>) {
  const { t } = useTranslation("understand");
  const { data, problem } = useOverview();
  const signals = data?.kobold.toLookAt ?? [];
  const order = data?.personas.map((card) => card.persona.id) ?? [];
  const tint = (id: string) => tintOf(Math.max(order.indexOf(id), 0));
  return (
    <div className="grid content-start gap-4">
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
      />
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
      {data && signals.length === 0 && <CaughtUp />}
      {signals.length > 0 && <Board signals={signals} tint={tint} />}
      <Opened signals={signals} open={open} tint={tint} />
    </div>
  );
}

// The three columns, down to the end of the page as on Factory. On a phone
// they stack instead, those with something in them first and the empty ones
// last as a single line, so nothing waits off to the side.
function Board({
  signals,
  tint,
}: Readonly<{ signals: SignalView[]; tint: (persona: string) => string }>) {
  const { t } = useTranslation("understand");
  const [board, height] = useDownToTheEnd("var(--board-below)");
  const columns = byColumn(signals);
  return (
    <div
      ref={board}
      className="overflow-x-auto pb-2 [--board-below:48px] md:[--board-below:60px]"
    >
      <div
        className="grid content-start gap-3 md:grid-cols-[repeat(3,minmax(15rem,1fr))] md:content-stretch"
        style={{ minHeight: height }}
      >
        {COLUMNS.map((column) => (
          <section
            key={column}
            aria-label={t(`signals.columns.${column}`)}
            className={cn(
              "grid content-start gap-2.5 rounded-2xl bg-ground p-3",
              columns[column].length === 0 && "max-md:order-last max-md:py-1.5",
            )}
          >
            <h2 className="flex items-center gap-2 px-1.5 py-1 text-item [&_svg]:size-4">
              {ICONS[column]}
              {t(`signals.columns.${column}`)}
              <span className="text-tag text-muted-foreground">
                {columns[column].length}
              </span>
            </h2>
            {columns[column].length === 0 && (
              <p className="px-1.5 text-note text-muted-foreground max-md:hidden">
                {t("signals.nothingHere")}
              </p>
            )}
            {columns[column].map((signal) => (
              <SignalCard key={signal.id} signal={signal} tint={tint} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

// The signal the address names, in full, in a dialog; closing it goes back
// to the board. Once it is handled it leaves the board, and the dialog
// closes with it.
function Opened({
  signals,
  open,
  tint,
}: Readonly<{
  signals: SignalView[];
  open: string | null;
  tint: (persona: string) => string;
}>) {
  const jobs = useKoboldJobs();
  const id = idFrom(open);
  const signal = signals.find((one) => one.id === id);
  return (
    <Dialog
      open={signal !== undefined}
      onOpenChange={(opened) => {
        if (!opened) window.location.hash = signalsHash();
      }}
    >
      {signal && (
        <DialogContent className="max-w-xl gap-0 p-6 sm:p-7">
          <DialogTitle className="sr-only">{quoted(signal.text)}</DialogTitle>
          <SignalDetail
            key={signal.id}
            signal={signal}
            tint={tint}
            job={jobs.find(
              (job) => job.kind === "sort" && job.about === signal.id,
            )}
          />
        </DialogContent>
      )}
    </Dialog>
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
      className="flex w-fit items-center gap-2 text-note text-muted-foreground transition-colors hover:text-foreground"
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
