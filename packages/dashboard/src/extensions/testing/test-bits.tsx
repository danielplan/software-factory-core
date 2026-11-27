// A test's status as a small round icon, how its moments
// went as a row of small bars, and what it found as chips.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { TestRow } from "@/api/client";
import { cn } from "@/lib/utils";

type Status = TestRow["status"];

const GREY = "#9a9fad";
const LINE = "var(--line-soft)";

export function StatusIcon({
  status,
  size = 16,
}: Readonly<{ status: Status; size?: number }>) {
  const ring = (color: string) => (
    <circle cx="8" cy="8" r="6" fill="none" stroke={color} strokeWidth="1.5" />
  );
  const shapes: Record<Status, ReactNode> = {
    queued: ring(GREY),
    running: (
      <>
        {ring(LINE)}
        <path
          d="M8 2 A6 6 0 0 1 14 8"
          fill="none"
          stroke="var(--blue)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    ),
    done: (
      <>
        <circle cx="8" cy="8" r="7" fill="var(--success)" />
        <path
          d="m5 8.2 2 2 4-4.2"
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
    failed: (
      <>
        <circle cx="8" cy="8" r="7" fill={GREY} />
        <path
          d="m5.6 5.6 4.8 4.8M10.4 5.6l-4.8 4.8"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className={cn("flex-none", status === "running" && "animate-spin")}
    >
      {shapes[status]}
    </svg>
  );
}

// The colour of a moment: went fine, not as expected (with nothing filed),
// an idea, an open question, a bug.
const MOMENT_COLORS: Record<TestRow["moments"][number], string> = {
  ok: "bg-success",
  surprise: "bg-stopped",
  idea: "bg-type-request",
  question: "bg-type-feedback",
  bug: "bg-type-bug",
};

// How each moment went, one small bar each, in the order they happened.
export function MomentBars({
  moments,
}: Readonly<{ moments: TestRow["moments"] }>) {
  return (
    <span aria-hidden className="flex flex-none gap-[3px]">
      {moments.map((kind, index) => (
        <i
          key={index}
          className={cn("h-[18px] w-[7px] rounded-[3px]", MOMENT_COLORS[kind])}
        />
      ))}
    </span>
  );
}

const COUNT_TONES = {
  bug: "bg-type-bug/10 text-type-bug",
  idea: "bg-type-request/10 text-type-request",
  question: "bg-type-feedback/10 text-type-feedback",
  ok: "bg-success/10 text-success",
  surprise: "bg-surface-2 text-foreground-2",
} as const;

// One count as a chip: "3 bugs", "5 went fine".
export function CountChip({
  kind,
  children,
}: Readonly<{ kind: keyof typeof COUNT_TONES; children: ReactNode }>) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] flex-none items-center rounded-full px-2.5 text-[11.5px] font-medium whitespace-nowrap",
        COUNT_TONES[kind],
      )}
    >
      {children}
    </span>
  );
}

// What a test found, as chips: its bugs, ideas and open questions, and how
// many moments went fine when asked.
export function Counts({
  test,
  fine,
}: Readonly<{ test: Pick<TestRow, "counts" | "moments">; fine?: boolean }>) {
  const t = useTranslation().t;
  const { bug, idea, question } = test.counts;
  const ok = test.moments.filter((kind) => kind === "ok").length;
  return (
    <span className="flex flex-wrap gap-1.5">
      {bug > 0 && (
        <CountChip kind="bug">
          {t("testing.counts.bug", { count: bug })}
        </CountChip>
      )}
      {idea > 0 && (
        <CountChip kind="idea">
          {t("testing.counts.idea", { count: idea })}
        </CountChip>
      )}
      {question > 0 && (
        <CountChip kind="question">
          {t("testing.counts.question", { count: question })}
        </CountChip>
      )}
      {fine && ok > 0 && (
        <CountChip kind="ok">
          {t("testing.counts.wentFine", { count: ok })}
        </CountChip>
      )}
    </span>
  );
}
