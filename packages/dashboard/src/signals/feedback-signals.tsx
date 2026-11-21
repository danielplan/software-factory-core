// Variant F: feedback on the Signals page, as ordinary signals with the
// source "Feedback board" and where each stands (sent, seen, planned, done).
// Two kinds: what this person sent to the public feedback board, and, in
// the factory that reads the board, posts arriving from it.
//
// PROTOTYPE: English only; the posts arriving from the board are made up,
// and Fix, Explore and Dismiss only take them off the list here.

import { ExternalLink, MessageSquareHeart } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import {
  BOARD,
  issueUrl,
  type Kind,
  ON_BOARD,
  type State,
  useMine,
} from "@/feedback/feedback-board";
import { StatePill } from "@/feedback/feedback-row";
import { cn } from "@/lib/utils";

import { CARD, TypeChip } from "./bits";

export type FeedbackSignal = {
  id: string;
  number: number;
  kind: Kind;
  title: string;
  state: State;
  // Sent by this person, or arriving from the board.
  from: "you" | "board";
  who: string;
  thumbs: number;
  // When it was sent or arrived, as in a signal (made up for the older ones).
  at: string;
};

// Made-up times for the posts nobody sent in this visit: hours ago.
const LOADED = Date.now();
const HOURS_AGO: Record<number, number> = {
  44: 30,
  41: 2,
  38: 9,
  35: 20,
  33: 75,
  29: 50,
  27: 120,
  22: 100,
};
const atOf = (number: number, sent = 0) =>
  new Date(
    sent > 0 ? sent : LOADED - (HOURS_AGO[number] ?? 48) * 3_600_000,
  ).toISOString();

// Who sent the posts arriving from the board (made up).
const SENDERS: Record<number, string> = {
  41: "@harbor-team",
  38: "@north-studio",
  35: "@lumen-labs",
  29: "@quay-works",
  22: "@pine-co",
};

// Arrivals handled here, for the visit.
let handled = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function handle(id: string) {
  handled = new Set([...handled, id]);
  for (const listener of listeners) listener();
}

export function useFeedbackSignals(): FeedbackSignal[] {
  const mine = useMine();
  const done = useSyncExternalStore(subscribe, () => handled);
  const sent = mine.map((one): FeedbackSignal => ({
    id: `board-${String(one.number)}`,
    number: one.number,
    kind: one.kind,
    title: one.title,
    state: one.state,
    from: "you",
    who: "You",
    thumbs: ON_BOARD.find((there) => there.number === one.number)?.thumbs ?? 1,
    at: atOf(one.number, one.sent),
  }));
  const arriving = ON_BOARD.filter(
    (one) =>
      !mine.some((m) => m.number === one.number) &&
      !done.has(`board-${String(one.number)}`),
  ).map((one): FeedbackSignal => ({
    id: `board-${String(one.number)}`,
    number: one.number,
    kind: one.kind,
    title: one.title,
    state: one.state,
    from: "board",
    who: SENDERS[one.number] ?? "A team",
    thumbs: one.thumbs,
    at: atOf(one.number),
  }));
  return [...arriving.slice(0, 3), ...sent];
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
      {chip(!feedback, "All", false)}
      {chip(feedback, `Feedback · ${String(count)}`, true)}
    </div>
  );
}

const typeOf = (kind: Kind) => (kind === "bug" ? "bug" : "request");

function BoardIcon({ size = 34 }: Readonly<{ size?: number }>) {
  return (
    <span
      title="Feedback board"
      style={{ width: size, height: size }}
      className="grid flex-none place-items-center rounded-full bg-[#8b8ff0]/12 text-[#6366d8]"
    >
      <MessageSquareHeart
        aria-hidden
        strokeWidth={2}
        style={{ width: size / 2 }}
      />
    </span>
  );
}

// Where it comes from, in a few words.
const sourceLine = (one: FeedbackSignal) =>
  one.from === "you" ? "Sent to the feedback board" : "From the feedback board";

// A feedback signal in the list.
export function FeedbackItem({
  one,
  picked,
  href,
}: Readonly<{ one: FeedbackSignal; picked: boolean; href: string }>) {
  return (
    <a
      href={href}
      aria-current={picked ? "true" : undefined}
      className={cn(
        "flex items-start gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0 hover:bg-surface",
        picked && "bg-picked hover:bg-picked",
      )}
    >
      <BoardIcon />
      <span className="grid min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{one.who}</span>
          <span className="ml-auto">
            <TypeChip type={typeOf(one.kind)} />
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-foreground-2">
          {one.title}
        </span>
        <span className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
          {sourceLine(one)}
          <StatePill state={one.state} />
        </span>
      </span>
    </a>
  );
}

const STEPS: State[] = ["sent", "seen", "planned", "done"];

// The feedback signal picked: what it says, where it stands, a link to it
// on the board; one arriving from the board can be fixed or explored.
export function FeedbackDetail({
  one,
  onDone,
}: Readonly<{ one: FeedbackSignal; onDone: (said: string) => void }>) {
  const [busy, setBusy] = useState(false);
  const at = STEPS.indexOf(one.state);
  const act = (said: string) => {
    setBusy(true);
    setTimeout(() => {
      handle(one.id);
      onDone(said);
    }, 400);
  };
  return (
    <article
      aria-label={`Feedback #${String(one.number)}`}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <BoardIcon size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{one.who}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {one.from === "you"
              ? "Feedback board · sent by you"
              : "Feedback board"}
          </span>
        </span>
        <TypeChip type={typeOf(one.kind)} />
      </header>
      <div className="mt-5 mb-[22px] text-base leading-normal tracking-[-0.01em]">
        <Markdown text={one.title} />
        <p className="mt-2 text-[13px] text-muted-foreground">
          👍 {one.thumbs} {one.thumbs === 1 ? "team wants" : "teams want"} this
        </p>
      </div>
      <div className="mb-[22px] flex items-center gap-3">
        <span className="flex gap-1" aria-hidden>
          {STEPS.map((step, index) => (
            <span
              key={step}
              className={cn(
                "h-1 w-8 rounded-full",
                index <= at ? "bg-[#8b8ff0]" : "bg-line-soft",
              )}
            />
          ))}
        </span>
        <StatePill state={one.state} />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {one.from === "board" && (
          <>
            <Button
              variant={one.kind === "bug" ? "default" : "ring"}
              size="pill"
              disabled={busy}
              onClick={() => {
                act(`Made up: sent #${String(one.number)} to be fixed`);
              }}
            >
              Fix
            </Button>
            <Button
              variant={one.kind === "bug" ? "ring" : "default"}
              size="pill"
              disabled={busy}
              onClick={() => {
                act(`Made up: #${String(one.number)} waits in Explorations`);
              }}
            >
              Explore
            </Button>
          </>
        )}
        <a
          href={issueUrl(one.number)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground [&_svg]:size-3.5"
        >
          #{one.number} on {BOARD}
          <ExternalLink aria-hidden />
        </a>
      </div>
      <p className="mt-4 text-[11px] text-faint">Made up for this prototype.</p>
    </article>
  );
}
