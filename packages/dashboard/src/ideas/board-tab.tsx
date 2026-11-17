import { ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Trans } from "react-i18next";

import {
  type CardView,
  type IdeaView,
  post,
  type TicketView,
  type WorkView,
} from "@/api";
import { useBuild } from "@/build/use-build";
import type { FactoryState } from "@/dashboard/dashboard";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { boardOf, ConnectedBoard } from "@/connect/connected-board";

import { useDownToTheEnd } from "@/lib/use-down-to-the-end";

import { BoardCard, jobOf, type Working } from "./board-card";
import { BoardWorkers } from "./board-workers";
import { IdeaCard } from "./idea-card";
import { t } from "../i18n/i18n.ts";
import { STAGES } from "./stages";

// The columns work moves through: Backlog holds the ideas agreed to (a
// draft stays on Explore) and the connected board's cards, each in
// the column of its stage. The last is where a change is in the app.
const COLUMNS = STAGES.filter((stage) => stage.id !== "draft");

const SWITCHES = { coach: "/api/coach-in-cards", builder: "/api/builder" };

// What the factory is doing: with a connected board, who works it (the
// coach and the builder, each with its switch); then every piece of work in
// the column of how far it is. Before there is any, it says where work
// starts. Cards Kobble knows say what they are for, and ask "did it
// work?" once they are in the app.
export function BoardTab({ state }: Readonly<{ state: FactoryState }>) {
  const { work } = state;
  const build = useBuild();
  const [problem, setProblem] = useState<string | null>(null);
  const press = (path: string, body: unknown = {}) => {
    setProblem(null);
    post(path, body).catch((error: unknown) => {
      setProblem(error instanceof Error ? error.message : String(error));
    });
  };
  const now = doing(state.ideas, work);
  const empty = nothingYet(state, build.waiting);
  const shown = problem ?? work?.problem ?? work?.builder.problem ?? null;
  return (
    <div className="grid gap-3">
      <BoardHeader
        state={state}
        now={now}
        onRead={() => {
          press("/api/work/refresh");
        }}
      />
      {work && (
        <BoardWorkers
          work={work}
          onSwitch={(who, on) => {
            press(SWITCHES[who], { on });
          }}
        />
      )}
      {shown && <ProblemBox title={t("build:page.problem")} text={shown} />}
      {empty && (
        <p className="px-1 text-body text-muted-foreground">
          <Trans
            ns="build"
            i18nKey="page.empty"
            components={{
              link: (
                <a
                  href="#explore"
                  className="text-foreground underline underline-offset-2"
                />
              ),
            }}
          />
        </p>
      )}
      <ConnectedBoard state={state} brief />
      {build.shown}
      <Columns
        ideas={state.ideas}
        work={work}
        tickets={build.tickets}
        onAsk={build.ask}
      />
    </div>
  );
}

// The title, and what the factory is busy with, in a few words, when no
// board is connected (with one, the coach's and the builder's rows say it);
// with one, a way to it and to read it again now, in the top bar.
function BoardHeader({
  state,
  now,
  onRead,
}: Readonly<{
  state: FactoryState;
  now: { busy: boolean; text: string };
  onRead: () => void;
}>) {
  const board = boardOf(state);
  // With a board, the coach's and builder's rows say what is going on.
  const about = state.work ? undefined : <Doing now={now} />;
  return (
    <PageHead
      title={t("build:page.title")}
      about={about}
      actions={
        state.work && (
          <>
            <Button variant="outline" onClick={onRead}>
              <RefreshCw aria-hidden />
              {t("build:page.refresh")}
            </Button>
            {board && (
              <Button asChild variant="outline">
                <a href={board.href} target="_blank" rel="noreferrer">
                  {t("build:page.openOn", { site: board.site })}
                  <ArrowUpRight aria-hidden />
                </a>
              </Button>
            )}
          </>
        )
      }
    />
  );
}

// What the factory is busy with, in a line.
function Doing({ now }: Readonly<{ now: { busy: boolean; text: string } }>) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {now.busy ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <span
          aria-hidden
          className="size-2 shrink-0 rounded-full bg-muted-foreground/40"
        />
      )}
      <span className="truncate" title={now.text}>
        {now.text}
      </span>
    </span>
  );
}

// Every piece of work, in the column of its stage: the board's cards, then
// the agreed ideas.
function Columns({
  ideas: all,
  work,
  tickets,
  onAsk,
}: Readonly<{
  ideas: IdeaView[];
  work: WorkView | null;
  tickets: Map<number, TicketView>;
  onAsk: (card: CardView) => void;
}>) {
  const [board, height] = useDownToTheEnd("var(--board-below)");
  return (
    <div
      ref={board}
      className="overflow-x-auto pb-2 [--board-below:48px] md:[--board-below:60px]"
    >
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${String(COLUMNS.length)}, minmax(12rem, 1fr))`,
          minHeight: height,
        }}
      >
        {COLUMNS.map((column) => {
          const ideas = all.filter((one) => one.status === column.id);
          const cards = (work?.cards ?? []).filter(
            (card) => card.stage === column.id,
          );
          return (
            <section
              key={column.id}
              aria-label={column.title}
              className="grid content-start gap-2.5 rounded-2xl bg-ground p-3"
            >
              <h2 className="flex items-center gap-2 px-1.5 py-1 text-item">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: column.colour }}
                />
                {column.title}
                <span className="font-normal text-muted-foreground">
                  {String(ideas.length + cards.length)}
                </span>
              </h2>
              {cards.map((card) => (
                <BoardCard
                  key={card.number}
                  card={card}
                  working={workingOn(work, card.number)}
                  ticket={tickets.get(card.number) ?? null}
                  onAsk={() => {
                    onAsk(card);
                  }}
                />
              ))}
              {ideas.map((one) => (
                <IdeaCard key={one.id} idea={one} status={false} />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// Nothing at all: no idea agreed to, no card, no fix waiting for one.
function nothingYet(state: FactoryState, waiting: number): boolean {
  return (
    !state.ideas.some((one) => one.status !== "draft") &&
    (state.work?.cards.length ?? 0) === 0 &&
    waiting === 0
  );
}

// Who works on this card now, if anyone, and on what.
function workingOn(work: WorkView | null, number: number): Working | null {
  const building = work?.builder.working;
  if (work && building?.number === number)
    return { job: jobOf(building.what), steps: work.builder.steps };
  if (work?.coach.working === number)
    return { job: "plan", steps: work.coach.steps };
  return null;
}

// What the factory is busy with, in a line: the builder's card, an idea it
// is thinking about, cards ready to build, work waiting, or nothing yet.
function doing(
  ideas: IdeaView[],
  work: WorkView | null,
): { busy: boolean; text: string } {
  const building = work?.builder.working;
  if (building)
    return {
      busy: true,
      text: t(`build:now.${jobOf(building.what)}`, {
        number: building.number,
        title: building.title,
      }),
    };
  const working = ideas.filter((one) => one.working);
  const [first] = working;
  if (first)
    return {
      busy: true,
      text:
        working.length === 1
          ? t("build:now.thinkingAbout", { title: first.title })
          : t("build:now.thinkingMany", { count: working.length }),
    };
  return waitingLine(ideas, work);
}

// Nothing being worked on: what waits, or nothing yet.
function waitingLine(
  ideas: IdeaView[],
  work: WorkView | null,
): { busy: boolean; text: string } {
  const ready = (work?.cards ?? []).filter((card) => card.stage === "todo");
  const on = work?.builder.on ?? false;
  if (ready.length > 0)
    return {
      busy: false,
      text: t(on ? "build:now.readyOn" : "build:now.readyOff", {
        count: ready.length,
      }),
    };
  const waiting = ideas.filter((one) => one.status === "backlog").length;
  if (waiting > 0)
    return { busy: false, text: t("build:now.backlog", { count: waiting }) };
  return {
    busy: false,
    text: t(on ? "build:now.builderWaiting" : "build:now.waiting"),
  };
}
