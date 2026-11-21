// Prototype (variant B): one inbox, any source, in the ordinary Signals
// list. Requests from the team, errors from the factory and posts from the
// public feedback board arrive as signals, each with its source; a filter
// at the top shows one source at a time. The picked one goes straight to
// To do when it is small, or is explored. Everything here is made up.

import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CAME, cameWords } from "@/factory/board-card";
import { useLiveErrors } from "@/factory/live-errors";
import { type Came, sendToDo } from "@/factory/made-up";
import { cn } from "@/lib/utils";

import { CARD, Toast } from "./bits";
import { nextAfter, shownOf } from "./view";

type Arrived = {
  id: string;
  came: Came;
  title: string;
  text: string;
  // Who sent it, or where it was seen.
  from: string;
  ago: string;
  // Small enough to go straight to To do, as the kobold reads it.
  small: boolean;
  times?: number;
};

const FIRST: Arrived[] = [
  {
    id: "s-1",
    came: "error",
    title: "The builder stopped: “git push rejected (non-fast-forward)”",
    text: "The builder could not push card #41 and stopped. Seen on the factory itself, not in a product.",
    from: "The factory, while building",
    ago: "4 min ago",
    small: true,
    times: 6,
  },
  {
    id: "s-2",
    came: "request",
    title: "Let us rename a persona",
    text: "We named one too quickly and now every page says “Persona 2”.",
    from: "Mira, on the team",
    ago: "20 min ago",
    small: true,
  },
  {
    id: "s-3",
    came: "board",
    title: "Show what a prototype costs before it starts",
    text: "Three people voted for it on the public board. They want to see the time and money a prototype will take before they press Make.",
    from: "Feedback board · 3 votes",
    ago: "1 h ago",
    small: false,
  },
  {
    id: "s-4",
    came: "issue",
    title: "#212 Signals from a second live app",
    text: "We run two apps and want both in one factory. Opened on GitHub by another team.",
    from: "GitHub · another team",
    ago: "yesterday",
    small: false,
  },
  {
    id: "s-5",
    came: "board",
    title: "The Sync now button is hard to find on a phone",
    text: "It hides under the title on small screens.",
    from: "Feedback board · 1 vote",
    ago: "2 days ago",
    small: true,
  },
];

// The factory's own errors while the page is open: a new one, then one
// seen already.
const LATER = [
  { title: "Reading the GitHub board timed out after 30 seconds" },
  { title: "The builder stopped: “git push rejected (non-fast-forward)”" },
  { title: "Reading the GitHub board timed out after 30 seconds" },
];

// Kept while the app is open, so leaving the page keeps what was handled.
let kept = FIRST;

const FILTERS: (Came | null)[] = [null, "request", "error", "board", "issue"];
const FILTER_WORDS: Record<Came, string> = {
  request: "Request",
  error: "Error",
  board: "Feedback board",
  issue: "GitHub issue",
};

const signalHash = (id: string | null) =>
  id ? `#signals/${encodeURIComponent(id)}` : "#signals";

export function AnySource({ open }: Readonly<{ open: string | null }>) {
  const [all, setAll] = useState(kept);
  const [only, setOnly] = useState<Came | null>(null);
  const [said, say] = useState<string | null>(null);
  const change = (next: (was: Arrived[]) => Arrived[]) => {
    setAll((was) => {
      kept = next(was);
      return kept;
    });
  };

  // The factory's own errors keep arriving while the page is open; the
  // same one again counts on its signal.
  useLiveErrors((title) => {
    change((was) => {
      const seen = was.find((one) => one.title === title);
      if (seen)
        return was.map((one) =>
          one === seen ? { ...one, times: (one.times ?? 1) + 1, ago: "just now" } : one,
        );
      return [
        {
          id: `s-${String(Date.now())}`,
          came: "error",
          title,
          text: "Reported by the factory itself as it happened.",
          from: "The factory, live",
          ago: "just now",
          small: true,
          times: 1,
        },
        ...was,
      ];
    });
  }, LATER);

  const signals = all.filter((one) => only === null || one.came === only);
  const shown = shownOf(signals, open);
  const picked = open !== null && shown?.id === open;
  const handled = (one: Arrived, words: string) => {
    window.location.hash = signalHash(nextAfter(signals, one.id));
    change((was) => was.filter((other) => other.id !== one.id));
    say(words);
  };

  return (
    <>
      <Filter
        all={all}
        only={only}
        onPick={(came) => {
          setOnly(came);
          window.location.hash = signalHash(null);
        }}
      />
      <div className="grid items-start gap-4 lg:grid-cols-[430px_minmax(0,1fr)]">
        <div className={cn(picked && "max-lg:hidden")}>
          <List signals={signals} shown={shown?.id ?? null} />
        </div>
        <div className={cn("grid gap-3.5", !picked && "max-lg:hidden")}>
          <a
            href={signalHash(null)}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue lg:hidden"
          >
            <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
            Signals
          </a>
          {shown ? (
            <Detail
              key={shown.id}
              signal={shown}
              onToDo={() => {
                sendToDo(shown.title, {
                  came: shown.came,
                  times: shown.times,
                  type: shown.came === "error" ? "bug" : "feature",
                  fix: shown.came === "error",
                });
                handled(shown, `“${shown.title}” is in the factory's To do`);
              }}
              onExplore={() => {
                handled(shown, `“${shown.title}” is waiting in Explorations`);
              }}
              onDismiss={() => {
                handled(shown, "Dismissed");
              }}
            />
          ) : (
            <p
              className={cn(
                CARD,
                "p-[50px] text-center text-[13px] text-muted-foreground",
              )}
            >
              No new signals.
            </p>
          )}
        </div>
      </div>
      {said && (
        <Toast
          text={said}
          onOk={() => {
            say(null);
          }}
        />
      )}
    </>
  );
}

// One source at a time, or all of them.
function Filter({
  all,
  only,
  onPick,
}: Readonly<{
  all: Arrived[];
  only: Came | null;
  onPick: (came: Came | null) => void;
}>) {
  return (
    <div
      role="group"
      aria-label="Show signals from"
      className="mt-2 mb-4 flex flex-wrap gap-1.5"
    >
      {FILTERS.map((came) => {
        const count = all.filter((one) => came === null || one.came === came).length;
        const on = came === only;
        return (
          <button
            key={came ?? "all"}
            type="button"
            aria-pressed={on}
            onClick={() => {
              onPick(came);
            }}
            className={cn(
              "inline-flex h-[30px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-colors",
              on
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground-2 shadow-card hover:bg-surface",
            )}
          >
            {came ? FILTER_WORDS[came] : "All"}
            <span className={cn("text-[11.5px]", on ? "opacity-70" : "text-muted-foreground")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SourceOf({ came, size }: Readonly<{ came: Came; size: number }>) {
  const { Icon, tone } = CAME[came];
  return (
    <span
      title={FILTER_WORDS[came]}
      style={{ width: size, height: size }}
      className={cn("grid flex-none place-items-center rounded-full", tone)}
    >
      <Icon aria-hidden strokeWidth={2} style={{ width: size / 2 }} />
    </span>
  );
}

function SourceChip({ signal }: Readonly<{ signal: Arrived }>) {
  const { tone } = CAME[signal.came];
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap",
        tone,
      )}
    >
      {signal.came === "error" ? cameWords(signal) : FILTER_WORDS[signal.came]}
    </span>
  );
}

function List({
  signals,
  shown,
}: Readonly<{ signals: Arrived[]; shown: string | null }>) {
  return (
    <nav aria-label="New signals" className={cn(CARD, "grid")}>
      {signals.length === 0 && (
        <p className="p-[50px] text-center text-[13px] text-muted-foreground">
          No new signals.
        </p>
      )}
      {signals.map((signal) => (
        <a
          key={signal.id}
          href={signalHash(signal.id)}
          aria-current={signal.id === shown ? "true" : undefined}
          className={cn(
            "flex items-start gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0 hover:bg-surface",
            signal.id === shown && "bg-picked hover:bg-picked",
          )}
        >
          <SourceOf came={signal.came} size={34} />
          <span className="grid min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-[12.5px] text-muted-foreground">
                {signal.from}
              </span>
              <span className="ml-auto">
                <SourceChip signal={signal} />
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 font-semibold">
              {signal.title}
            </span>
          </span>
        </a>
      ))}
    </nav>
  );
}

function Detail({
  signal,
  onToDo,
  onExplore,
  onDismiss,
}: Readonly<{
  signal: Arrived;
  onToDo: () => void;
  onExplore: () => void;
  onDismiss: () => void;
}>) {
  return (
    <article
      aria-label={signal.title}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <SourceOf came={signal.came} size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{signal.from}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {FILTER_WORDS[signal.came]} · {signal.ago}
          </span>
        </span>
        <SourceChip signal={signal} />
      </header>
      <h2 className="mt-5 text-base font-semibold tracking-[-0.01em]">
        {signal.title}
      </h2>
      <p className="mt-1.5 mb-[22px] text-[14px] leading-normal text-foreground-2">
        {signal.text}
      </p>
      <p className="mb-3 text-[12.5px] text-muted-foreground">
        {signal.small
          ? "The kobold thinks this is small: it can go straight to To do."
          : "The kobold thinks this is bigger: explore it first."}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {signal.small && (
          <Button size="pill" onClick={onToDo}>
            Straight to To do
          </Button>
        )}
        <Button
          size="pill"
          variant={signal.small ? "ring" : "default"}
          onClick={onExplore}
        >
          Explore
        </Button>
        <Button size="pill" variant="ring" className="ml-auto" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </article>
  );
}
