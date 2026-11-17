// Signals: what the live app reported, typed by where it came from (bug,
// feature request, feedback). The new ones in a list, the one picked beside
// it with Fix, Explore (or Add to an exploration it is already about) and
// Dismiss. A handled signal leaves the list; it stays on its persona and,
// once explored, on its exploration. The header says when the live app was
// last read, with Sync now.

import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { messageOf, post, type SignalRow } from "@/api";
import { PageHead } from "@/components/page-head";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { PersonaFace, SourceIcon, TypeChip } from "./bits";
import { useSignals } from "./use-signals";
import {
  agoOf,
  alreadyLine,
  exploreWords,
  nextAfter,
  primaryOf,
  shownOf,
  SOURCE_WORDS,
  syncLine,
  whoOf,
} from "./view";

type Said = { text: string; failed: boolean };

export function SignalsPage() {
  const { data, problem } = useSignals();
  const [said, say] = useState<Said | null>(null);
  const now = new Date();
  return (
    <div className="grid content-start gap-4">
      <PageHead
        title="Signals"
        about={data ? syncLine(data.sync, now) : undefined}
        actions={<SyncNow onSaid={say} />}
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
      {said && <SaidLine said={said} />}
      {data && <Board signals={data.signals} now={now} onSaid={say} />}
    </div>
  );
}

// What the last button did, or why it did not.
function SaidLine({ said }: Readonly<{ said: Said }>) {
  return (
    <p
      role={said.failed ? "alert" : "status"}
      className={cn(
        "text-sm",
        said.failed ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {said.text}
    </p>
  );
}

// The new signals, and the one picked beside them.
function Board({
  signals,
  now,
  onSaid,
}: Readonly<{
  signals: SignalRow[];
  now: Date;
  onSaid: (said: Said) => void;
}>) {
  const [picked, pick] = useState<string | null>(null);
  const shown = shownOf(signals, picked);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
      <SignalList signals={signals} shown={shown?.id ?? null} onPick={pick} />
      {shown ? (
        <SignalDetail
          key={shown.id}
          signal={shown}
          now={now}
          onDone={(text) => {
            pick(nextAfter(signals, shown.id));
            onSaid({ text, failed: false });
          }}
          onFailed={(text) => {
            onSaid({ text, failed: true });
          }}
        />
      ) : (
        <Empty />
      )}
    </div>
  );
}

function Empty() {
  return (
    <p className="rounded-2xl bg-card px-5 py-10 text-center text-sm text-muted-foreground shadow-soft max-lg:hidden">
      No new signals.
    </p>
  );
}

function SyncNow({ onSaid }: Readonly<{ onSaid: (said: Said) => void }>) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        post<{ added: number }>("/api/kobble/sync")
          .then(
            ({ added }) => {
              onSaid({
                text:
                  added === 0
                    ? "Synced with the live app · nothing new"
                    : `Synced with the live app · ${String(added)} new`,
                failed: false,
              });
            },
            (error: unknown) => {
              onSaid({ text: messageOf(error), failed: true });
            },
          )
          .finally(() => {
            setBusy(false);
          });
      }}
    >
      <RefreshCw aria-hidden className={cn(busy && "animate-spin")} />
      Sync now
    </Button>
  );
}

function SignalList({
  signals,
  shown,
  onPick,
}: Readonly<{
  signals: SignalRow[];
  shown: string | null;
  onPick: (id: string) => void;
}>) {
  return (
    <nav
      aria-label="New signals"
      className="grid overflow-hidden rounded-2xl bg-card shadow-soft"
    >
      {signals.length === 0 && (
        <p className="px-5 py-10 text-center text-sm text-muted-foreground">
          No new signals.
        </p>
      )}
      {signals.map((signal) => (
        <button
          key={signal.id}
          type="button"
          aria-current={signal.id === shown ? "true" : undefined}
          onClick={() => {
            onPick(signal.id);
          }}
          className={cn(
            "flex items-start gap-3 border-t border-border-soft px-4 py-3.5 text-left first:border-t-0 hover:bg-surface",
            signal.id === shown && "bg-tint hover:bg-tint",
          )}
        >
          <SourceIcon source={signal.source} />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">
                {whoOf(signal)}
              </span>
              <span className="ml-auto">
                <TypeChip type={signal.type} />
              </span>
            </span>
            <span className="line-clamp-2 text-sm text-foreground-2">
              {signal.text}
            </span>
          </span>
        </button>
      ))}
    </nav>
  );
}

type Act = "fix" | "explore" | "dismiss";

// What a button did, in words.
function doneWords(act: Act, signal: SignalRow, answer: unknown): string {
  if (act === "fix") return `${signal.id} goes to the factory to be fixed`;
  if (act === "dismiss") return `${signal.id} dismissed`;
  const { exploration } = answer as { exploration: { id: string } };
  return signal.already?.kind === "exploration"
    ? `${signal.id} added to ${exploration.id}`
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
  return (
    <article
      aria-label={`Signal ${signal.id}`}
      className="grid gap-5 rounded-2xl bg-card px-6 py-6 shadow-soft sm:px-7"
    >
      <header className="flex items-center gap-3">
        <PersonaFace id={signal.persona} name={signal.personaName} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate text-sm font-semibold">
            {whoOf(signal)}
          </span>
          <span className="text-xs text-muted-foreground">
            {SOURCE_WORDS[signal.source]} · {agoOf(signal.at, now)}
          </span>
        </span>
        <TypeChip type={signal.type} />
      </header>
      <p className="text-xl leading-normal tracking-[-0.01em]">{signal.text}</p>
      <Already signal={signal} />
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant={primary === "fix" ? "default" : "outline"}
          size="lg"
          disabled={busy}
          onClick={() => {
            act("fix");
          }}
        >
          Fix
        </Button>
        <Button
          variant={primary === "explore" ? "default" : "outline"}
          size="lg"
          disabled={busy}
          onClick={() => {
            act("explore");
          }}
        >
          {exploreWords(signal)}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="ml-auto"
          disabled={busy}
          onClick={() => {
            act("dismiss");
          }}
        >
          Dismiss
        </Button>
      </div>
    </article>
  );
}

// The one plain line about work that exists already.
function Already({ signal }: Readonly<{ signal: SignalRow }>) {
  const line = alreadyLine(signal);
  if (!line) return null;
  return (
    <p
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        signal.already?.kind === "work"
          ? "bg-solved text-solved-foreground"
          : "bg-surface text-foreground-2",
      )}
    >
      {line.words} <b className="font-semibold">{line.what}</b>
    </p>
  );
}
