// Signals: what the live app reported, typed by where it came from (bug,
// feature request, feedback). The new ones in a list, the one picked beside
// it (#signals/<id>) with Fix, Explore (or Add to an exploration it is
// already about) and Dismiss. In variant F, feedback is there too: what
// this person sent to the public feedback board and what arrives from it,
// with a Feedback filter at the top (feedback-signals.tsx). A handled signal leaves the list; it stays on
// its persona and, once explored, on its exploration. The header says when
// the live app was last read, with Sync now. On a phone the list and the
// picked signal are two screens, with a link back to the list.

import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { messageOf, post, type SignalRow, type SignalsView } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { VARIANT } from "@/lib/variant";

import { Already } from "./already";
import { AllQuiet } from "./empty";
import { BeforeLaunch } from "./before-launch";
import { CARD, FaceOf, Head, SourceIcon, Toast, TypeChip } from "./bits";
import {
  FeedbackDetail,
  FeedbackItem,
  type FeedbackSignal,
  Filter,
  useFeedbackSignals,
} from "./feedback-signals";
import { StepOf } from "./step";
import { SyncNow } from "./sync-now";
import { useSignals } from "./use-signals";
import {
  type Act,
  agoOf,
  doneWords,
  exploreWords,
  nextAfter,
  primaryOf,
  shownOf,
  syncLine,
  whoOf,
} from "./view";
import { useT } from "@/i18n/use-t";

const signalHash = (id: string | null) =>
  id ? `#signals/${encodeURIComponent(id)}` : "#signals";

export function SignalsPage({
  open,
  app,
}: Readonly<{ open: string | null; app: string }>) {
  const { data, problem } = useSignals();
  const [said, say] = useState<string | null>(null);
  const t = useT();
  const now = new Date();
  return (
    <>
      <Head
        title={t.shell.pages.signals}
        right={
          data?.sync.connected ? (
            <>
              <span className="text-[12.5px] text-muted-foreground">
                {syncLine(data.sync, now, t.words)}
              </span>
              <SyncNow onSaid={say} />
            </>
          ) : undefined
        }
      />
      {problem && <ProblemBox title={t.signals.cannotRead} text={problem} />}
      {data?.sync.problem && (
        <ProblemBox title={t.signals.syncFailed} text={data.sync.problem} />
      )}
      {data && (
        <Shown data={data} app={app} open={open} now={now} onSaid={say} />
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

// The new signals; before launch, the personas on a mission and, with no
// signal yet, where the first come from; after it, with none, that all is
// quiet.
function Shown({
  data,
  app,
  open,
  now,
  onSaid,
}: Readonly<{
  data: SignalsView;
  app: string;
  open: string | null;
  now: Date;
  onSaid: (said: string) => void;
}>) {
  const feedback = useFeedbackSignals();
  const [only, setOnly] = useState(false);
  const shownFeedback = VARIANT === "F" ? feedback : [];
  const before = !data.sync.connected && (
    <BeforeLaunch
      app={app}
      missions={data.missions}
      empty={data.signals.length + shownFeedback.length === 0}
    />
  );
  if (data.signals.length > 0 || shownFeedback.length > 0)
    return (
      <div className="grid gap-4">
        {shownFeedback.length > 0 && (
          <Filter
            feedback={only}
            count={shownFeedback.length}
            onPick={setOnly}
          />
        )}
        <Board
          signals={only ? [] : data.signals}
          feedback={shownFeedback}
          open={open}
          now={now}
          onSaid={onSaid}
        />
        {before}
      </div>
    );
  return before || <AllQuiet app={app} sync={data.sync} now={now} />;
}

// The new signals, and the one picked beside them (on a phone, instead of
// them).
function Board({
  signals,
  feedback,
  open,
  now,
  onSaid,
}: Readonly<{
  signals: SignalRow[];
  feedback: FeedbackSignal[];
  open: string | null;
  now: Date;
  onSaid: (said: string) => void;
}>) {
  const t = useT();
  // One list, newest first: the signals and the feedback mixed by time.
  const all: (SignalRow | FeedbackSignal)[] = [...feedback, ...signals].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );
  const shown = shownOf(all, open);
  const picked = open !== null && shown?.id === open;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[430px_minmax(0,1fr)]">
      <div className={cn(picked && "max-lg:hidden")}>
        <SignalList all={all} shown={shown?.id ?? null} />
      </div>
      <div className={cn("grid gap-3.5", !picked && "max-lg:hidden")}>
        <a
          href={signalHash(null)}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue lg:hidden"
        >
          <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
          {t.shell.pages.signals}
        </a>
        {shown && "from" in shown ? (
          <FeedbackDetail
            key={shown.id}
            one={shown}
            onDone={(text) => {
              window.location.hash = signalHash(nextAfter(all, shown.id));
              onSaid(text);
            }}
          />
        ) : shown ? (
          <SignalDetail
            key={shown.id}
            signal={shown}
            now={now}
            onDone={(text) => {
              window.location.hash = signalHash(nextAfter(all, shown.id));
              onSaid(text);
            }}
            onFailed={onSaid}
          />
        ) : (
          <p
            className={cn(
              CARD,
              "p-[50px] text-center text-[13px] text-muted-foreground",
            )}
          >
            {t.signals.noneNew}
          </p>
        )}
      </div>
    </div>
  );
}

function SignalList({
  all,
  shown,
}: Readonly<{
  all: (SignalRow | FeedbackSignal)[];
  shown: string | null;
}>) {
  const t = useT();
  return (
    <nav aria-label={t.signals.newSignals} className={cn(CARD, "grid")}>
      {all.length === 0 && (
        <p className="p-[50px] text-center text-[13px] text-muted-foreground">
          {t.signals.noneNew}
        </p>
      )}
      {all.map((signal) =>
        "from" in signal ? (
          <FeedbackItem
            key={signal.id}
            one={signal}
            picked={signal.id === shown}
            href={signalHash(signal.id)}
          />
        ) : (
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
                <span className="truncate font-semibold">
                  {whoOf(signal, t.words)}
                </span>
                <span className="ml-auto">
                  <TypeChip type={signal.type} />
                </span>
              </span>
              <span className="mt-0.5 line-clamp-2 text-foreground-2">
                <Markdown text={signal.text} inline />
              </span>
              <StepOf signal={signal} />
            </span>
          </a>
        ),
      )}
    </nav>
  );
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
  const [busy, setBusy] = useState<Act | null>(null);
  const t = useT();
  const act = (what: Act) => {
    setBusy(what);
    post(`/api/kobble/signals/${what}`, { id: signal.id }).then(
      (answer) => {
        onDone(doneWords(what, signal, answer, t.words));
      },
      (error: unknown) => {
        setBusy(null);
        onFailed(messageOf(error));
      },
    );
  };
  const primary = primaryOf(signal);
  const button = (what: Act, words: string, dark: boolean) => (
    <Button
      variant={dark ? "default" : "ring"}
      size="pill"
      busy={busy === what}
      disabled={busy !== null}
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
      aria-label={t.signals.signal(signal.id)}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <FaceOf face={signal.personaFace} size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">
            {whoOf(signal, t.words)}
          </span>
          <span className="text-[12.5px] text-muted-foreground">
            {t.words.sources[signal.source]} · {agoOf(signal.at, now, t.words)}
          </span>
        </span>
        <TypeChip type={signal.type} />
      </header>
      <div className="mt-5 mb-[22px] text-base leading-normal tracking-[-0.01em]">
        <Markdown text={signal.text} />
        <StepOf signal={signal} link />
      </div>
      <Already signal={signal} />
      <div className="flex flex-wrap gap-2.5">
        {button("fix", t.signals.fix, primary === "fix")}
        {button(
          "explore",
          exploreWords(signal, t.words),
          primary === "explore",
        )}
        {button("dismiss", t.signals.dismiss, false)}
      </div>
    </article>
  );
}
