// Explorations: what is being explored (a card each, with a small preview
// of its canvas, its personas and one line from the kobold about what is
// next), what waits (Start), and one quiet line for what was handed off or
// dropped, which opens. New exploration starts one for a team idea.

import { ChevronDown, ChevronUp, CircleAlert, Plus } from "lucide-react";
import { useState } from "react";

import {
  type ExplorationRow,
  type ExplorationsView,
  messageOf,
  post,
} from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CARD, Chevron, Head, ROW } from "@/signals/bits";
import { countWords } from "@/signals/view";
import { type Read, useRead } from "@/lib/use-read";
import { Markdown } from "@/components/markdown";

import { Faces, Preview } from "./bits";
import { KINDS, whereItIs } from "./kinds";
import { FromBoard } from "./from-board";
import { NewExploration } from "./new-exploration";

export const explorationHash = (id: string) =>
  `#explore/${encodeURIComponent(id)}`;

export const useExplorations = () =>
  useRead("/api/kobble/explorations") as Read<ExplorationsView>;

export function ExplorationsPage() {
  const { data, problem } = useExplorations();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <Head
        title="Explorations"
        right={
          <Button
            size="pill"
            onClick={() => {
              setAdding(true);
            }}
          >
            <Plus aria-hidden strokeWidth={2.2} />
            New exploration
          </Button>
        }
      />
      {problem && (
        <ProblemBox title="The explorations cannot be read" text={problem} />
      )}
      {data &&
        (isEmpty(data) ? (
          <NothingYet
            onOwn={() => {
              setAdding(true);
            }}
          />
        ) : (
          <Lists view={data} />
        ))}
      <NewExploration
        open={adding}
        onClose={() => {
          setAdding(false);
        }}
      />
    </>
  );
}

function Sub({ title, n }: Readonly<{ title: string; n: number }>) {
  return (
    <h2 className="mt-3 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em]">
      {title}
      <span className="text-[12.5px] font-normal text-muted-foreground">
        {n}
      </span>
    </h2>
  );
}

function isEmpty(view: ExplorationsView): boolean {
  return (
    view.exploring.length +
      view.waiting.length +
      view.done.length +
      view.fromBoard.length ===
    0
  );
}

// A board in small, for the picture of what an exploration is.
const EXAMPLE: ExplorationRow = {
  id: "X-0",
  title: "",
  status: "exploring",
  problem: "",
  work: null,
  personas: [],
  signals: 0,
  things: [
    {
      id: "problem",
      kind: "problem",
      agreed: false,
      label: "Customers can’t pay by card",
    },
    { id: "choice", kind: "choice", agreed: false, label: "How do they pay?" },
    { id: "a", kind: "prototype", agreed: false, label: "A: Pay in the app" },
    { id: "b", kind: "prototype", agreed: true, label: "B: A payment link" },
  ],
  links: [
    { from: "problem", to: "choice" },
    { from: "choice", to: "a" },
    { from: "choice", to: "b" },
  ],
  line: null,
  busy: null,
};

// Before anything is explored: what an exploration is, and two ways to
// start one.
function NothingYet({ onOwn }: Readonly<{ onOwn: () => void }>) {
  return (
    <div
      className={cn(
        CARD,
        "grid items-center gap-8 px-7 py-10 md:grid-cols-[minmax(0,1fr)_360px]",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="text-base font-semibold">Nothing explored yet</div>
        <p className="max-w-[440px] text-[14.5px] text-foreground-2">
          An exploration is a board you work on with the kobold: what the
          problem really is, a few ways to solve it, and a prototype for each.
          The one you agree on goes to the factory.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2.5">
          <Button asChild size="pill">
            <a href="#signals">Explore a signal</a>
          </Button>
          <Button variant="ring" size="pill" onClick={onOwn}>
            Start from your own idea
          </Button>
        </div>
      </div>
      <div className="opacity-90">
        <Preview row={EXAMPLE} />
      </div>
    </div>
  );
}

function Lists({ view }: Readonly<{ view: ExplorationsView }>) {
  return (
    <>
      <Sub title="Being explored" n={view.exploring.length} />
      {view.exploring.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {view.exploring.map((row) => (
            <Exploring key={row.id} row={row} />
          ))}
        </div>
      )}
      {view.exploring.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          Nothing is being explored. Start one that waits.
        </p>
      )}
      <Sub title="Waiting" n={view.waiting.length + view.fromBoard.length} />
      <div className={CARD}>
        {view.waiting.map((row) => (
          <Waiting key={row.id} row={row} />
        ))}
        {view.fromBoard.map((idea) => (
          <FromBoard key={idea.number} idea={idea} />
        ))}
        {view.waiting.length + view.fromBoard.length === 0 && (
          <p className="p-[18px] text-center text-muted-foreground">
            Nothing waiting
          </p>
        )}
      </div>
      <Done rows={view.done} />
    </>
  );
}

// One being explored: the board as it really is, in small, where it is
// in its colour, and the kobold's question; a click opens it.
function Exploring({ row }: Readonly<{ row: ExplorationRow }>) {
  const where = whereItIs(row);
  const { tint } = KINDS[where.kind];
  return (
    <a
      href={explorationHash(row.id)}
      className={cn(
        CARD,
        "flex flex-col gap-3 p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-14px_rgb(20_24_36/0.35)]",
      )}
    >
      <Preview row={row} />
      <span className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-base font-semibold">{row.title}</span>
        <span
          className={cn(
            "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium",
            tint,
          )}
        >
          {where.text}
        </span>
        <span className="ml-auto">
          <Faces personas={row.personas} size={26} />
        </span>
      </span>
      {row.line && (
        <span className="flex items-start gap-2 rounded-[10px] bg-wash px-2.5 py-[9px] text-[13px] text-wash-foreground">
          <KoboldHead size={18} />
          <Markdown text={row.line} inline />
        </span>
      )}
    </a>
  );
}

function Waiting({ row }: Readonly<{ row: ExplorationRow }>) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className={cn(ROW, "transition-colors hover:bg-surface")}>
      <span className="grid size-9 flex-none place-items-center rounded-xl bg-[#fdf1d8] text-[#8a5a12]">
        <CircleAlert aria-hidden className="size-[18px]" />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-semibold">{row.title}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          <Markdown text={row.problem} inline />
        </span>
        {problem && (
          <span role="alert" className="text-[12.5px] text-destructive">
            {problem}
          </span>
        )}
      </span>
      <Faces personas={row.personas} size={26} />
      {row.signals > 0 && (
        <span className="inline-flex h-6 items-center rounded-full bg-[#e8f0fe] px-2 text-xs font-medium text-[#2948bc]">
          {countWords(row.signals, "signal", "signals")}
        </span>
      )}
      <Button
        variant="ring"
        size="pill-sm"
        onClick={() => {
          post("/api/kobble/explorations/start", { id: row.id }).then(
            () => {
              window.location.hash = explorationHash(row.id);
            },
            (error: unknown) => {
              setProblem(messageOf(error));
            },
          );
        }}
      >
        Start
      </Button>
    </div>
  );
}

function Done({ rows }: Readonly<{ rows: ExplorationRow[] }>) {
  const [open, setOpen] = useState(false);
  const handed = rows.filter((row) => row.status === "handed-off").length;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
        }}
        className="mt-1.5 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted-foreground"
      >
        {handed} handed off · {rows.length - handed} dropped
        {open ? (
          <ChevronUp aria-hidden className="size-4" />
        ) : (
          <ChevronDown aria-hidden className="size-4" />
        )}
      </button>
      {open && rows.length > 0 && (
        <div className={CARD}>
          {rows.map((row) => (
            <a
              key={row.id}
              href={explorationHash(row.id)}
              className={cn(ROW, "hover:bg-surface")}
            >
              <span className="flex-1">{row.title}</span>
              <span className="text-[12.5px] text-muted-foreground">
                {row.work ? `#${String(row.work)}` : "Dropped"}
              </span>
              <Chevron />
            </a>
          ))}
        </div>
      )}
    </>
  );
}
