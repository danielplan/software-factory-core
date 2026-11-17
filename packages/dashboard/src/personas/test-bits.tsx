// A persona test's status as a small round icon, as a chip, and the tabs
// on a persona's page.

import type { ReactNode } from "react";

import type { PersonaTest } from "@/api";
import { cn } from "@/lib/utils";
import { TEST_WORDS } from "@/signals/view";

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
        {ring("var(--blue)")}
        <path d="M8 4.5 A3.5 3.5 0 0 1 8 11.5 Z" fill="var(--blue)" />
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
      className={cn("flex-none", status === "running" && "animate-breathe")}
    >
      {shapes[status]}
    </svg>
  );
}

export function StatusChip({ status }: Readonly<{ status: Status }>) {
  return (
    <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-foreground-2 shadow-[inset_0_0_0_1px_var(--line-soft)]">
      <StatusIcon status={status} size={12} />
      {TEST_WORDS[status]}
    </span>
  );
}

// Segmented tabs: a grey track, the current one white.
export function Tabs({
  tabs,
}: Readonly<{
  tabs: { name: string; count: number; href: string; on: boolean }[];
}>) {
  return (
    <nav
      aria-label="Tabs"
      className="mb-4 inline-flex gap-0.5 rounded-[14px] bg-[#eceef2] p-1"
    >
      {tabs.map((tab) => (
        <a
          key={tab.name}
          href={tab.href}
          aria-current={tab.on ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 font-medium text-muted-foreground",
            tab.on &&
              "bg-card text-foreground shadow-[0_1px_3px_rgb(20_24_36/0.1)]",
          )}
        >
          {tab.name} <span className="text-xs text-faint">{tab.count}</span>
        </a>
      ))}
    </nav>
  );
}
