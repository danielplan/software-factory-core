// Small pieces Kobble's pages share: the page's header with its buttons on
// the right, a white card, a signal's source as a round icon, its type as a
// tinted pill, a persona's face (or an empty tile), a chevron, and the
// toast that says what a button did.

import {
  Activity,
  Bug,
  ChevronRight,
  FlaskConical,
  MessageSquareHeart,
  SquarePlus,
} from "lucide-react";
import type { ReactNode } from "react";

import type { Face, SignalRow } from "@/api";
import { KoboldHead, NoFace, PersonaFace } from "@/components/kobold-face";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";

// A white card: radius 20px, a hairline ring.
export const CARD = "overflow-hidden rounded-xl bg-card shadow-card";
// A row in a card, with a line above all but the first.
export const ROW =
  "flex w-full items-center gap-3.5 border-t border-border-soft px-5 py-3.5 text-left first:border-t-0";

export function Head({
  title,
  right,
}: Readonly<{ title: string; right?: ReactNode }>) {
  return (
    <header className="mb-1.5 flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">
        {title}
      </h1>
      {right && (
        <div className="flex flex-wrap items-center gap-2.5">{right}</div>
      )}
    </header>
  );
}

const SOURCES: Record<SignalRow["source"], { icon: typeof Bug; tone: string }> =
  {
    app: { icon: SquarePlus, tone: "bg-source-app/10 text-source-app" },
    usage: { icon: Activity, tone: "bg-source-usage/10 text-source-usage" },
    errors: { icon: Bug, tone: "bg-source-errors/10 text-source-errors" },
    test: { icon: FlaskConical, tone: "bg-source-test/10 text-source-test" },
    feedback: {
      icon: MessageSquareHeart,
      tone: "bg-[#8b8ff0]/12 text-[#6366d8]",
    },
  };

export function SourceIcon({
  source,
  size = 34,
}: Readonly<{ source: SignalRow["source"]; size?: number }>) {
  const t = useT();
  const { icon: Icon, tone } = SOURCES[source];
  return (
    <span
      title={t.words.sources[source]}
      style={{ width: size, height: size }}
      className={cn("grid flex-none place-items-center rounded-full", tone)}
    >
      <Icon aria-hidden strokeWidth={2} style={{ width: size / 2 }} />
    </span>
  );
}

const TYPES: Record<SignalRow["type"], string> = {
  bug: "bg-type-bug/10 text-type-bug",
  request: "bg-type-request/10 text-type-request",
  feedback: "bg-type-feedback/10 text-type-feedback",
  // From a mission: an idea in the colour of a request, an open question
  // in the colour of feedback.
  idea: "bg-type-request/10 text-type-request",
  question: "bg-type-feedback/10 text-type-feedback",
};

export function TypeChip({ type }: Readonly<{ type: SignalRow["type"] }>) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap",
        TYPES[type],
      )}
    >
      {t.words.types[type]}
    </span>
  );
}

// A persona's face, or an empty tile for someone no persona stands for.
export function FaceOf({
  face,
  size,
}: Readonly<{ face: Face | null; size: number }>) {
  return face ? (
    <PersonaFace face={face} size={size} />
  ) : (
    <NoFace size={size} />
  );
}

export function Chevron() {
  return (
    <ChevronRight aria-hidden className="ml-1.5 size-4 flex-none text-faint" />
  );
}

// What the last button did, at the bottom of the window, until OK.
export function Toast({
  text,
  onOk,
}: Readonly<{ text: string; onOk: () => void }>) {
  return (
    <div
      role="status"
      className="fixed bottom-[26px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2.5 rounded-[14px] bg-primary px-4 py-[11px] text-[13px] text-primary-foreground shadow-big"
    >
      <KoboldHead size={20} />
      {text}
      <button
        type="button"
        onClick={onOk}
        className="font-semibold text-[#9fb4ff]"
      >
        {useT().signals.ok}
      </button>
    </div>
  );
}
