import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

import { type IdeaView, post, type WorkView } from "@/api";
import type { FactoryState } from "@/dashboard/dashboard";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";

import { ConnectedBoard } from "@/connect/connected-board";

import { BoardCard, type Working } from "./board-card";
import { BoardWorkers } from "./board-workers";
import { IdeaCard } from "./idea-card";
import { STAGES } from "./stages";

// The columns work moves through: Backlog holds the ideas agreed to (a
// draft stays on the Ideas tab) and the connected board's cards, each in
// the column of its stage.
const COLUMNS = STAGES.filter((stage) => stage.id !== "draft");

const SWITCHES = { coach: "/api/coach-in-cards", builder: "/api/builder" };

// What the factory is doing: with a connected board, who works it (the
// coach and the builder, each with its switch); then every piece of work in
// the column of how far it is. Before there is any, it says where work
// starts.
export function BoardTab({ state }: Readonly<{ state: FactoryState }>) {
  const { work } = state;
  const [problem, setProblem] = useState<string | null>(null);
  const press = (path: string, body: unknown = {}) => {
    setProblem(null);
    post(path, body).catch((error: unknown) => {
      setProblem(error instanceof Error ? error.message : String(error));
    });
  };
  const now = doing(state.ideas, work);
  const empty =
    !state.ideas.some((one) => one.status !== "draft") &&
    (work?.cards.length ?? 0) === 0;
  const shown = problem ?? work?.problem ?? work?.builder.problem ?? null;
  return (
    <div className="grid gap-3">
      <BoardHeader now={now} work={work} />
      {work && (
        <BoardWorkers
          work={work}
          onSwitch={(who, on) => {
            press(SWITCHES[who], { on });
          }}
        />
      )}
      {shown && <ProblemBox title="That did not work" text={shown} />}
      {empty && (
        <p className="px-1 text-sm text-muted-foreground">
          Nothing on the board yet. Work starts as an{" "}
          <a
            href="#ideas"
            className="text-foreground underline underline-offset-2"
          >
            idea
          </a>
          : once you agree to its plan, it comes here.
        </p>
      )}
      <WhereTracked
        state={state}
        onRead={() => {
          press("/api/work/refresh");
        }}
      />
      <Columns ideas={state.ideas} work={work} />
    </div>
  );
}

// The title, and what the factory is busy with when no board is connected
// (with one, the coach's and the builder's rows say it).
function BoardHeader({
  now,
  work,
}: Readonly<{ now: { busy: boolean; text: string }; work: WorkView | null }>) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Board</h1>
      {!work && (
        <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
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
      )}
    </div>
  );
}

// Where the work is tracked, and a way to read the board again now.
function WhereTracked({
  state,
  onRead,
}: Readonly<{ state: FactoryState; onRead: () => void }>) {
  const { work } = state;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <ConnectedBoard state={state} brief />
      {work && (
        <Button
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-[13px] text-muted-foreground"
          onClick={onRead}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Read it again
        </Button>
      )}
    </div>
  );
}

// Every piece of work, in the column of its stage: the board's cards, then
// the agreed ideas.
function Columns({
  ideas: all,
  work,
}: Readonly<{ ideas: IdeaView[]; work: WorkView | null }>) {
  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${String(COLUMNS.length)}, minmax(12rem, 1fr))`,
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
              className="grid min-h-[60vh] content-start gap-2 rounded-2xl p-2.5"
              style={{
                background: `color-mix(in oklab, ${column.colour} 7%, var(--card))`,
              }}
            >
              <h2 className="flex items-center gap-2 px-1.5 py-1 text-[13px] font-semibold">
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

// Who works on this card now, if anyone.
function workingOn(work: WorkView | null, number: number): Working | null {
  const building = work?.builder.working;
  if (work && building?.number === number)
    return {
      who: "The builder",
      what: building.what,
      steps: work.builder.steps,
    };
  if (work?.coach.working === number)
    return { who: "The coach", what: "planning", steps: work.coach.steps };
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
      text: `The builder is ${building.what} #${String(building.number)} “${building.title}”`,
    };
  const working = ideas.filter((one) => one.working);
  const [first] = working;
  if (first)
    return {
      busy: true,
      text:
        working.length === 1
          ? `Thinking about “${first.title}”`
          : `Thinking about ${String(working.length)} ideas`,
    };
  return waitingLine(ideas, work);
}

// Nothing being worked on: what waits, or nothing yet.
function waitingLine(
  ideas: IdeaView[],
  work: WorkView | null,
): { busy: boolean; text: string } {
  const ready = (work?.cards ?? []).filter((card) => card.stage === "todo");
  if (ready.length > 0)
    return {
      busy: false,
      text: work?.builder.on
        ? `${String(ready.length)} ready: the builder takes the next one`
        : `${String(ready.length)} ready to build: switch the builder on`,
    };
  const waiting = ideas.filter((one) => one.status === "backlog").length;
  if (waiting > 0)
    return {
      busy: false,
      text: `${String(waiting)} in the backlog, waiting to be built`,
    };
  return {
    busy: false,
    text: work?.builder.on
      ? "The builder is waiting for work"
      : "Waiting for work",
  };
}
