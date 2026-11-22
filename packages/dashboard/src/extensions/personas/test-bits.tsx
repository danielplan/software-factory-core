// A mission's status as a small round icon, and as a chip.

import type { ReactNode } from "react";

import type { PersonaTest } from "@/api/client";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";

type Status = PersonaTest["status"];

const GREY = "#9a9fad";

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
        {ring("var(--line-soft)")}
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

export function StatusChip({ status }: Readonly<{ status: Status }>) {
  const t = useT();
  return (
    <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground-2 shadow-[inset_0_0_0_1px_var(--line-soft)]">
      <StatusIcon status={status} size={12} />
      {t.words.tests[status]}
    </span>
  );
}
