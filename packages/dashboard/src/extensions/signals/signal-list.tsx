// The list of signals, newest first: each with its face (the persona's, or
// where it came from), its words and its type; a post of the feedback board
// also says where it stands. What this person sent to the board is in the
// list too, mixed in by time.

import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import type { SignalRow } from "@/api/client";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

import { CARD, FaceOf, SourceIcon, TypeChip } from "@/components/page-bits";
import { FeedbackLine } from "./feedback-extras";
import { SentItem, type SentSignal } from "./feedback-signals";
import { StepOf } from "./step";
import { whoOf } from "@/lib/signals-view";

export const signalPath = (id: string | null) =>
  id ? `/signals/${encodeURIComponent(id)}` : "/signals";

// A signal, or a post this person sent.
export type Listed = SignalRow | SentSignal;
export const isSent = (one: Listed): one is SentSignal => "title" in one;

export function SignalList({
  all,
  shown,
}: Readonly<{ all: Listed[]; shown: string | null }>) {
  const t = useTranslation().t;
  return (
    <nav aria-label={t("signals.newSignals")} className={cn(CARD, "grid")}>
      {all.length === 0 && (
        <p className="p-[50px] text-center text-[13px] text-muted-foreground">
          {t("signals.noneNew")}
        </p>
      )}
      {all.map((one) =>
        isSent(one) ? (
          <SentItem
            key={one.id}
            one={one}
            picked={one.id === shown}
            href={signalPath(one.id)}
          />
        ) : (
          <Item key={one.id} signal={one} picked={one.id === shown} />
        ),
      )}
    </nav>
  );
}

// A signal in the list: a post from the feedback board always has a face,
// the persona's or an empty tile ("No persona yet").
function Item({
  signal,
  picked,
}: Readonly<{ signal: SignalRow; picked: boolean }>) {
  const t = useTranslation().t;
  const board = signal.source === "feedback";
  return (
    <Link
      to={signalPath(signal.id)}
      aria-current={picked ? "true" : undefined}
      className={cn(
        "flex items-start gap-3.5 border-t border-border-soft px-5 py-3.5 first:border-t-0 hover:bg-surface",
        picked && "bg-picked hover:bg-picked",
      )}
    >
      {signal.personaFace || board ? (
        <FaceOf face={signal.personaFace} size={34} />
      ) : (
        <SourceIcon source={signal.source} />
      )}
      <span className="grid min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate font-semibold",
              board && !signal.personaName && "text-muted-foreground",
            )}
          >
            {board && !signal.personaName
              ? t("feedback.noPersona")
              : whoOf(signal, t)}
          </span>
          <span className="ml-auto">
            <TypeChip type={signal.type} />
          </span>
        </span>
        <span className="mt-0.5 line-clamp-2 text-foreground-2">
          <Markdown text={signal.text} inline />
        </span>
        {board ? <FeedbackLine signal={signal} /> : <StepOf signal={signal} />}
      </span>
    </Link>
  );
}
