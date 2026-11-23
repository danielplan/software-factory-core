// Signals: what the live app reported, typed by where it came from (bug,
// feature request, feedback). The new ones in a list, the one picked beside
// it (#signals/<id>) with Fix, Explore (or Add to an exploration it is
// already about) and Dismiss. A handled signal leaves the list; it stays on
// its persona and, once explored, on its exploration. The header says when
// the live app was last read, with Sync now. On a phone the list and the
// picked signal are two screens, with a link back to the list.

import { Link, useNavigate } from "react-router";
import { ChevronLeft, FlaskConical, Wrench, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  messageOf,
  post,
  type SignalRow,
  type SignalsView,
} from "@/api/client";
import { ProblemBox } from "@/components/layout/problem-box";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown";

import { Already } from "./already";
import { FeedbackExtras } from "./feedback-extras";
import {
  Filter,
  SentDetail,
  type SentSignal,
  useSentSignals,
} from "./feedback-signals";
import { isSent, type Listed, signalPath, SignalList } from "./signal-list";
import { AllQuiet } from "./empty";
import { BeforeLaunch } from "./before-launch";
import { CARD, FaceOf, Head, Toast, TypeChip } from "@/components/page-bits";
import { StepOf } from "./step";
import { SyncNow } from "./sync-now";
import { useSignals } from "@/api/use-signals";
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
} from "@/lib/signals-view";

export function SignalsPage({
  open,
  app,
}: Readonly<{ open: string | null; app: string }>) {
  const { data, problem } = useSignals();
  const [said, say] = useState<string | null>(null);
  const t = useTranslation().t;
  const now = new Date();
  return (
    <>
      <Head
        title={t("shell.pages.signals")}
        right={
          data?.sync.connected ? (
            <>
              <span className="text-[12.5px] text-muted-foreground">
                {syncLine(data.sync, now, t)}
              </span>
              <SyncNow onSaid={say} />
            </>
          ) : undefined
        }
      />
      {problem && <ProblemBox title={t("signals.cannotRead")} text={problem} />}
      {data?.sync.problem && (
        <ProblemBox title={t("signals.syncFailed")} text={data.sync.problem} />
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
  const sent = useSentSignals();
  const [only, setOnly] = useState(false);
  const feedback = data.signals.filter((one) => one.source === "feedback");
  const count = feedback.length + sent.length;
  const before = !data.sync.connected && (
    <BeforeLaunch
      app={app}
      missions={data.missions}
      empty={data.signals.length + sent.length === 0}
    />
  );
  if (data.signals.length + sent.length > 0)
    return (
      <div className="grid gap-4">
        {count > 0 && <Filter feedback={only} count={count} onPick={setOnly} />}
        <Board
          signals={only ? feedback : data.signals}
          sent={sent}
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
  sent,
  open,
  now,
  onSaid,
}: Readonly<{
  signals: SignalRow[];
  sent: SentSignal[];
  open: string | null;
  now: Date;
  onSaid: (said: string) => void;
}>) {
  const t = useTranslation().t;
  const navigate = useNavigate();
  // One list, newest first: the signals and what this person sent, mixed by
  // time.
  const all: Listed[] = [...sent, ...signals].sort(
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
        <Link
          to={signalPath(null)}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-blue lg:hidden"
        >
          <ChevronLeft aria-hidden className="size-[15px]" strokeWidth={2.2} />
          {t("shell.pages.signals")}
        </Link>
        {shown && isSent(shown) && <SentDetail one={shown} />}
        {shown && !isSent(shown) ? (
          <SignalDetail
            key={shown.id}
            signal={shown}
            now={now}
            onDone={(text) => {
              void navigate(signalPath(nextAfter(all, shown.id)));
              onSaid(text);
            }}
            onFailed={onSaid}
          />
        ) : (
          !shown && (
            <p
              className={cn(
                CARD,
                "p-[50px] text-center text-[13px] text-muted-foreground",
              )}
            >
              {t("signals.noneNew")}
            </p>
          )
        )}
      </div>
    </div>
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
  const t = useTranslation().t;
  const act = (what: Act) => {
    setBusy(what);
    post(`/api/kobble/signals/${what}`, { id: signal.id }).then(
      (answer) => {
        onDone(doneWords(what, signal, answer, t));
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
      {what === "fix" && <Wrench aria-hidden />}
      {what === "explore" && <FlaskConical aria-hidden />}
      {what === "dismiss" && <X aria-hidden />}
      {words}
    </Button>
  );
  return (
    <article
      aria-label={t("signals.signal", { id: signal.id })}
      className={cn(CARD, "px-7 py-[26px] max-sm:px-5")}
    >
      <header className="flex items-center gap-2.5">
        <FaceOf face={signal.personaFace} size={36} />
        <span className="grid min-w-0 flex-1">
          <span className="truncate font-semibold">{whoOf(signal, t)}</span>
          <span className="text-[12.5px] text-muted-foreground">
            {t(`words.sources.${signal.source}`)} · {agoOf(signal.at, now, t)}
          </span>
        </span>
        <TypeChip type={signal.type} />
      </header>
      <div className="mt-5 mb-[22px] text-base leading-normal tracking-[-0.01em]">
        <Markdown text={signal.text} />
        <StepOf signal={signal} link />
      </div>
      {signal.source === "feedback" && <FeedbackExtras signal={signal} />}
      <Already signal={signal} />
      <div className="flex flex-wrap gap-2.5">
        {button("fix", t("signals.fix"), primary === "fix")}
        {button("explore", exploreWords(signal, t), primary === "explore")}
        {button("dismiss", t("signals.dismiss"), false)}
      </div>
    </article>
  );
}
