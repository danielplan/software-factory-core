// Feedback on the Signals page. What this person sent to the public
// feedback board shows in the list with the source "Feedback board" and
// where it stands (sent, seen, planned, done); posts arriving from the board
// in a factory that reads it are ordinary signals (feedback-extras.tsx).

import { ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Markdown } from "@/components/markdown";
import {
  issueUrl,
  type Kind,
  type State,
  useBoardName,
  useMine,
} from "@/api/feedback-board";
import { StatePill } from "./state-pill";
import { cn } from "@/lib/utils";

import { BoardIcon, StateBar } from "./feedback-extras";
import { CARD, TypeChip } from "@/components/page-bits";

// A post this person sent (or gave a 👍), as a line of the list.
export type SentSignal = {
  id: string;
  number: number;
  kind: Kind;
  title: string;
  state: State;
  thumbs: number;
  // When it was sent, as in a signal.
  at: string;
};

export function useSentSignals(): SentSignal[] {
  const mine = useMine();
  return mine.map((one) => ({
    id: `board-${String(one.number)}`,
    number: one.number,
    kind: one.kind,
    title: one.title,
    state: one.state,
    thumbs: one.thumbs,
    at: one.at,
  }));
}

const typeOf = (kind: Kind) => (kind === "bug" ? "bug" : "request");

// A sent post in the list.
export function SentItem({
  one,
  picked,
  href,
}: Readonly<{ one: SentSignal; picked: boolean; href: string }>) {
  const t = useTranslation().t;
  return (
    <a
      href={href}
      aria-current={picked ? "true" : undefined}
      className={cn(
        "flex items-start gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0 hover:bg-surface",
        picked && "bg-picked hover:bg-picked",
      )}
    >
      <BoardIcon size={34} />
      <span className="grid min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{t("feedback.you")}</span>
          <span className="ml-auto">
            <TypeChip type={typeOf(one.kind)} />
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-foreground-2">
          {one.title}
        </span>
        <span className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
          {t("words.sources.feedback")}
          <StatePill state={one.state} />
        </span>
      </span>
    </a>
  );
}

// A sent post picked: what it says, where it stands, a link to it on the
// board.
export function SentDetail({ one }: Readonly<{ one: SentSignal }>) {
  const t = useTranslation().t;
  const board = useBoardName();
  return (
    <article
      aria-label={`#${String(one.number)}`}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <BoardIcon size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{t("feedback.you")}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {t("words.sources.feedback")}
          </span>
        </span>
        <TypeChip type={typeOf(one.kind)} />
      </header>
      <div className="mt-5 mb-[22px] text-base leading-normal tracking-[-0.01em]">
        <Markdown text={one.title} />
        <p className="mt-2 text-[13px] text-muted-foreground">
          👍 {one.thumbs}
        </p>
      </div>
      <div className="mb-[22px]">
        <StateBar state={one.state} />
      </div>
      <a
        href={issueUrl(one.number)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
      >
        #{one.number} · {board}
        <ExternalLink aria-hidden />
      </a>
    </article>
  );
}

// The filter at the top: every signal, or only the feedback.
export function Filter({
  feedback,
  count,
  onPick,
}: Readonly<{
  feedback: boolean;
  count: number;
  onPick: (feedback: boolean) => void;
}>) {
  const t = useTranslation().t;
  const chip = (on: boolean, words: string, pick: boolean) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        onPick(pick);
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12.5px] transition-colors",
        on
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border text-foreground-2 hover:bg-surface",
      )}
    >
      {words}
    </button>
  );
  return (
    <div className="flex items-center gap-1.5">
      {chip(!feedback, t("feedback.filterAll"), false)}
      {chip(
        feedback,
        `${t("feedback.filterFeedback")} · ${String(count)}`,
        true,
      )}
    </div>
  );
}
