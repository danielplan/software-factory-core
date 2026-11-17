// Signals: what the live app reported, typed by where it came from (bug,
// feature request, feedback). The new ones in a list, the one picked beside
// it (#signals/<id>) with Fix, Explore (or Add to an exploration it is
// already about) and Dismiss. A handled signal leaves the list; it stays on
// its persona and, once explored, on its exploration. The header says when
// the live app was last read, with Sync now. On a phone the list and the
// picked signal are two screens, with a link back to the list.

import { ChevronLeft, RefreshCw } from "lucide-react";
import { useState } from "react";

import { messageOf, post, type SignalRow } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Already } from "./already";
import { CARD, FaceOf, Head, SourceIcon, Toast, TypeChip } from "./bits";
import { useSignals } from "./use-signals";
import {
  agoOf,
  exploreWords,
  nextAfter,
  primaryOf,
  shownOf,
  SOURCE_WORDS,
  syncLine,
  whoOf,
} from "./view";

const signalHash = (id: string | null) =>
  id ? `#signals/${encodeURIComponent(id)}` : "#signals";

export function SignalsPage({ open }: Readonly<{ open: string | null }>) {
  const { data, problem } = useSignals();
  const [said, say] = useState<string | null>(null);
  const now = new Date();
  return (
    <>
      <Head
        title="Signals"
        right={
          <>
            {data && (
              <span className="text-[12.5px] text-muted-foreground">
                {syncLine(data.sync, now)}
              </span>
            )}
            <SyncNow onSaid={say} />
          </>
        }
      />
      {problem && (
        <ProblemBox title="The signals cannot be read" text={problem} />
      )}
      {data?.sync.problem && (
        <ProblemBox
          title="The last sync with the live app did not work"
          text={data.sync.problem}
        />
      )}
      {data && (
        <Board signals={data.signals} open={open} now={now} onSaid={say} />
      )}
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

// The new signals, and the one picked beside them (on a phone, instead of
// them).
function Board({
  signals,
  open,
  now,
  onSaid,
}: Readonly<{
  signals: SignalRow[];
  open: string | null;
  now: Date;
  onSaid: (said: string) => void;
}>) {
  const shown = shownOf(signals, open);
  const picked = open !== null && shown?.id === open;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[430px_minmax(0,1fr)]">
      <div className={cn(picked && "max-lg:hidden")}>
        <SignalList signals={signals} shown={shown?.id ?? null} />
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
          <SignalDetail
            key={shown.id}
            signal={shown}
            now={now}
            onDone={(text) => {
              window.location.hash = signalHash(nextAfter(signals, shown.id));
              onSaid(text);
            }}
            onFailed={onSaid}
          />
        ) : (
          <p
            className={cn(
              CARD,
              "p-[50px] text-center text-sm text-muted-foreground",
            )}
          >
            No new signals.
          </p>
        )}
      </div>
    </div>
  );
}

function SyncNow({ onSaid }: Readonly<{ onSaid: (said: string) => void }>) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="ring"
      size="pill"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        post<{ added: number }>("/api/kobble/sync")
          .then(
            ({ added }) => {
              onSaid(
                added === 0
                  ? "Synced with the live app · nothing new"
                  : `Synced with the live app · ${String(added)} new`,
              );
            },
            (error: unknown) => {
              onSaid(messageOf(error));
            },
          )
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <RefreshCw
        aria-hidden
        strokeWidth={2}
        className={cn("size-[15px]", busy && "animate-spin")}
      />
      Sync now
    </Button>
  );
}

function SignalList({
  signals,
  shown,
}: Readonly<{ signals: SignalRow[]; shown: string | null }>) {
  return (
    <nav aria-label="New signals" className={cn(CARD, "grid")}>
      {signals.length === 0 && (
        <p className="p-[50px] text-center text-sm text-muted-foreground">
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
          {signal.personaFace ? (
            <FaceOf face={signal.personaFace} size={34} />
          ) : (
            <SourceIcon source={signal.source} />
          )}
          <span className="grid min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate font-semibold">{whoOf(signal)}</span>
              <span className="ml-auto">
                <TypeChip type={signal.type} />
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 text-foreground-2">
              {signal.text}
            </span>
          </span>
        </a>
      ))}
    </nav>
  );
}

type Act = "fix" | "explore" | "dismiss";

// What a button did, in words.
function doneWords(act: Act, signal: SignalRow, answer: unknown): string {
  if (act === "fix") return `${signal.id} goes to the factory to be fixed`;
  if (act === "dismiss") return "Dismissed";
  const { exploration } = answer as { exploration: { id: string } };
  return signal.already?.kind === "exploration"
    ? `Added to ${exploration.id}`
    : `${exploration.id} is waiting in Explorations`;
}

function SignalDetail({
  signal,
  now,
  onDone,
  onFailed,
}: Readonly<{
  signal: SignalRow;
  now: Date;
  onDone: (said: string) => void;
  onFailed: (said: string) => void;
}>) {
  const [busy, setBusy] = useState(false);
  const act = (what: Act) => {
    setBusy(true);
    post(`/api/kobble/signals/${what}`, { id: signal.id }).then(
      (answer) => {
        onDone(doneWords(what, signal, answer));
      },
      (error: unknown) => {
        setBusy(false);
        onFailed(messageOf(error));
      },
    );
  };
  const primary = primaryOf(signal);
  const button = (what: Act, words: string, dark: boolean) => (
    <Button
      variant={dark ? "default" : "ring"}
      size="pill"
      disabled={busy}
      className={cn(what === "dismiss" && "ml-auto")}
      onClick={() => {
        act(what);
      }}
    >
      {words}
    </Button>
  );
  return (
    <article
      aria-label={`Signal ${signal.id}`}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <FaceOf face={signal.personaFace} size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{whoOf(signal)}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {SOURCE_WORDS[signal.source]} · {agoOf(signal.at, now)}
          </span>
        </span>
        <TypeChip type={signal.type} />
      </header>
      <p className="mt-5 mb-[22px] text-xl leading-normal tracking-[-0.01em]">
        {signal.text}
      </p>
      <Already signal={signal} />
      <div className="flex flex-wrap gap-2.5">
        {button("fix", "Fix", primary === "fix")}
        {button("explore", exploreWords(signal), primary === "explore")}
        {button("dismiss", "Dismiss", false)}
      </div>
    </article>
  );
}
