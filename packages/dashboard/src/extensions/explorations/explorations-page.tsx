// Explorations: what is being explored (a card each, with a small preview
// of its canvas, its personas and one line from the kobold about what is
// next), what waits (Start), and one quiet line for what was handed off or
// dropped, which opens. New exploration opens a fresh canvas at once, where
// the team says its idea to the kobold.

import { Link, useNavigate } from "react-router";
import type { TFunction } from "i18next";
import { ChevronDown, ChevronUp, Lightbulb, Plus, Radar } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type ExplorationRow,
  type ExplorationsView,
  messageOf,
  post,
} from "@/api/client";
import { useExplorations } from "@/api/use-explorations";
import { KoboldHead } from "@/components/kobold-face";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CARD, Chevron, Head, ROW } from "@/components/page-bits";
import { Markdown } from "@/components/markdown";

import { Faces, Preview } from "./bits";
import { KINDS, whereItIs } from "./kinds";
import { FromBoard } from "./from-board";
import { explorationPath, Waiting } from "./waiting-row";

export function ExplorationsPage() {
  const t = useTranslation().t;
  const navigate = useNavigate();
  const { data, problem } = useExplorations();
  const [refused, setRefused] = useState<string | null>(null);
  const adding = () => {
    setRefused(null);
    post<{ exploration: { id: string } }>("/api/kobble/explorations/fresh", {})
      .then(({ exploration }) => {
        void navigate(explorationPath(exploration.id));
      })
      .catch((error: unknown) => {
        setRefused(messageOf(error));
      });
  };
  return (
    <>
      <Head
        title={t("shell.pages.explore")}
        right={
          <Button size="pill" onClick={adding}>
            <Plus aria-hidden strokeWidth={2.2} />
            {t("explore.newExploration")}
          </Button>
        }
      />
      {problem && (
        <ProblemBox title={t("explore.cannotReadAll")} text={problem} />
      )}
      {refused && (
        <ProblemBox title={t("explore.cannotStart")} text={refused} />
      )}
      {data &&
        (isEmpty(data) ? <NothingYet onOwn={adding} /> : <Lists view={data} />)}
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
function exampleOf(e: TFunction): ExplorationRow {
  return {
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
        label: e("explore.example.problem"),
      },
      {
        id: "choice",
        kind: "choice",
        agreed: false,
        label: e("explore.example.choice"),
      },
      {
        id: "a",
        kind: "prototype",
        agreed: false,
        label: e("explore.example.a"),
      },
      {
        id: "b",
        kind: "prototype",
        agreed: true,
        label: e("explore.example.b"),
      },
    ],
    links: [
      { from: "problem", to: "choice" },
      { from: "choice", to: "a" },
      { from: "choice", to: "b" },
    ],
    line: null,
    busy: null,
  };
}

// Before anything is explored: what an exploration is, and two ways to
// start one.
function NothingYet({ onOwn }: Readonly<{ onOwn: () => void }>) {
  const t = useTranslation().t;
  return (
    <div
      className={cn(
        CARD,
        "grid items-center gap-8 px-7 py-10 md:grid-cols-[minmax(0,1fr)_360px]",
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="text-base font-semibold">{t("explore.nothingYet")}</div>
        <p className="max-w-[440px] text-[14.5px] text-foreground-2">
          {t("explore.whatItIs")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-2.5">
          <Button asChild size="pill">
            <Link to="/signals">
              <Radar aria-hidden />
              {t("explore.exploreSignal")}
            </Link>
          </Button>
          <Button variant="ring" size="pill" onClick={onOwn}>
            <Lightbulb aria-hidden />
            {t("explore.ownIdea")}
          </Button>
        </div>
      </div>
      <div className="opacity-90">
        <Preview row={exampleOf(t)} />
      </div>
    </div>
  );
}

function Lists({ view }: Readonly<{ view: ExplorationsView }>) {
  const t = useTranslation().t;
  return (
    <>
      <Sub title={t("explore.beingExplored")} n={view.exploring.length} />
      {view.exploring.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {view.exploring.map((row) => (
            <Exploring key={row.id} row={row} />
          ))}
        </div>
      )}
      {view.exploring.length === 0 && (
        <p className="text-[13px] text-muted-foreground">
          {t("explore.nothingExplored")}
        </p>
      )}
      <Sub
        title={t("explore.waiting")}
        n={view.waiting.length + view.fromBoard.length}
      />
      <div className={CARD}>
        {view.waiting.map((row) => (
          <Waiting key={row.id} row={row} />
        ))}
        {view.fromBoard.map((idea) => (
          <FromBoard key={idea.number} idea={idea} />
        ))}
        {view.waiting.length + view.fromBoard.length === 0 && (
          <p className="p-[18px] text-center text-muted-foreground">
            {t("explore.nothingWaiting")}
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
  const t = useTranslation().t;
  const where = whereItIs(row, t);
  const { tint } = KINDS[where.kind];
  return (
    <Link
      to={explorationPath(row.id)}
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
    </Link>
  );
}

function Done({ rows }: Readonly<{ rows: ExplorationRow[] }>) {
  const t = useTranslation().t;
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
        {t("explore.doneLine", { handed, dropped: rows.length - handed })}
        {open ? (
          <ChevronUp aria-hidden className="size-4" />
        ) : (
          <ChevronDown aria-hidden className="size-4" />
        )}
      </button>
      {open && rows.length > 0 && (
        <div className={CARD}>
          {rows.map((row) => (
            <Link
              key={row.id}
              to={explorationPath(row.id)}
              className={cn(ROW, "hover:bg-surface")}
            >
              <span className="flex-1">{row.title}</span>
              <span className="text-[12.5px] text-muted-foreground">
                {row.work ? `#${String(row.work)}` : t("explore.dropped")}
              </span>
              <Chevron />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
