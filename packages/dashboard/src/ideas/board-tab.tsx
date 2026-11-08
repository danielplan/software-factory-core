import { Hammer, Loader2, MessagesSquare, RefreshCw } from "lucide-react";
import { type ReactNode, useState } from "react";

import { type IdeaView, post, type WorkView } from "@/api";
import type { FactoryState } from "@/dashboard/dashboard";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ConnectedBoard } from "@/connect/connected-board";

import { BoardCard } from "./board-card";
import { IdeaCard } from "./idea-card";
import { STAGES } from "./stages";

// The columns work moves through: Backlog holds the ideas agreed to (a
// draft stays on the Ideas tab) and the connected board's cards, each in
// the column of its stage.
const COLUMNS = STAGES.filter((stage) => stage.id !== "draft");

const SMALL = "h-9 gap-1.5 px-3.5 text-[13px]";

// What the factory is doing: what it is busy with now, in a line beside
// the title, with the builder's and the coach's switches; then every piece
// of work in the column of how far it is. Before there is any, it says
// where work starts.
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
      <BoardHeader now={now} work={work} press={press} />
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
      <div className="px-1">
        <ConnectedBoard state={state} brief />
      </div>
      <Columns ideas={state.ideas} work={work} />
    </div>
  );
}

type Press = (path: string, body?: unknown) => void;

// The title, what the factory is busy with, and the builder's and the
// coach's switches.
function BoardHeader({
  now,
  work,
  press,
}: Readonly<{
  now: { busy: boolean; text: string };
  work: WorkView | null;
  press: Press;
}>) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1">
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Board</h1>
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
      {work && (
        <span className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className={SMALL}
            title="Read the board again"
            aria-label="Read the board again"
            onClick={() => {
              press("/api/work/refresh");
            }}
          >
            <RefreshCw className="size-3.5" aria-hidden />
          </Button>
          <Switch
            label="Coach in cards"
            hint="Answers what you write on a card in Planning, and moves it to Ready once you agree to its plan."
            on={work.coach.on}
            icon={<MessagesSquare className="size-3.5" aria-hidden />}
            onPress={(on) => {
              press("/api/coach-in-cards", { on });
            }}
          />
          <Switch
            label="Builder"
            hint="Builds the cards in Ready, one at a time, in a copy of the code of its own, and opens a pull request for each. It never merges."
            on={work.builder.on}
            icon={<Hammer className="size-3.5" aria-hidden />}
            onPress={(on) => {
              press("/api/builder", { on });
            }}
          />
        </span>
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

// A switch as a button that says whether it is on; its hint says what it
// does.
function Switch({
  label,
  hint,
  on,
  icon,
  onPress,
}: Readonly<{
  label: string;
  hint: string;
  on: boolean;
  icon: ReactNode;
  onPress: (on: boolean) => void;
}>) {
  return (
    <Button
      variant="outline"
      className={cn(
        SMALL,
        "transition-colors",
        on &&
          "border-transparent bg-[var(--tint)] text-white hover:bg-[var(--tint)]/90",
      )}
      title={hint}
      aria-pressed={on}
      onClick={() => {
        onPress(!on);
      }}
    >
      {icon}
      {label}: {on ? "on" : "off"}
    </Button>
  );
}

// What the builder or the coach is doing with this card, if anything.
function workingOn(work: WorkView | null, number: number): string | null {
  const building = work?.builder.working;
  if (building?.number === number)
    return work?.builder.activity ?? `The builder is ${building.what}…`;
  if (work?.coach.working === number) return "The coach is answering…";
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
