// Explorations: what is being explored (a card each, with a small preview
// of its canvas, its personas and one line from the kobold about what is
// next), what waits (Start), and one quiet line for what was handed off or
// dropped, which opens. New exploration starts one for a team idea.

import { ChevronDown, ChevronUp, Plus } from "lucide-react";
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
import { type Read, useRead } from "@/understand/use-records";

import { Faces, Preview } from "./bits";
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
      {data && <Lists view={data} />}
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

function Lists({ view }: Readonly<{ view: ExplorationsView }>) {
  return (
    <>
      <Sub title="Being explored" n={view.exploring.length} />
      <div className="grid gap-4 md:grid-cols-2">
        {view.exploring.map((row) => (
          <a
            key={row.id}
            href={explorationHash(row.id)}
            className={cn(CARD, "flex flex-col gap-3 p-3.5")}
          >
            <Preview row={row} />
            <span className="flex items-center gap-2.5 px-1">
              <span className="flex-1 text-base font-semibold">
                {row.title}
              </span>
              <Faces personas={row.personas} size={26} />
            </span>
            {row.line && (
              <span className="flex items-center gap-2 rounded-[10px] bg-wash px-2.5 py-[9px] text-[13px] text-[#1e2a55]">
                <KoboldHead size={18} />
                {row.line}
              </span>
            )}
          </a>
        ))}
      </div>
      {view.exploring.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing is being explored. Start one that waits.
        </p>
      )}
      <Sub title="Waiting" n={view.waiting.length} />
      <div className={CARD}>
        {view.waiting.map((row) => (
          <Waiting key={row.id} row={row} />
        ))}
        {view.waiting.length === 0 && (
          <p className="p-[18px] text-center text-muted-foreground">
            Nothing waiting
          </p>
        )}
      </div>
      <Done rows={view.done} />
    </>
  );
}

function Waiting({ row }: Readonly<{ row: ExplorationRow }>) {
  const [problem, setProblem] = useState<string | null>(null);
  return (
    <div className={ROW}>
      <Faces personas={row.personas} size={28} />
      <span className="grid min-w-0 flex-1">
        <span className="font-semibold">{row.title}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          {countWords(row.signals, "signal", "signals")} · {row.problem}
        </span>
        {problem && (
          <span role="alert" className="text-[12.5px] text-destructive">
            {problem}
          </span>
        )}
      </span>
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
