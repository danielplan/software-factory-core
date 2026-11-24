// A prototype while Tinker, Doodle's maker, makes it, before it runs: its
// page drawing itself piece by piece with a light sweeping over it, Tinker
// hopping at its work, what it does now, and how long it has been at it. Once it runs,
// the live screen shows instead, with one line of what the kobold does.
// Motion only when the computer allows it.

import { type CSSProperties, useEffect, useState } from "react";

import type { VersionRun } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { MAKER } from "@/lib/kobolds";
import { cn } from "@/lib/utils";

import { SCREEN } from "./prototype-screen";
import { useT } from "@/i18n/use-t";

// The pieces of the page, in the order they appear.
const PIECES = [
  "col-span-12 h-4 w-1/3 bg-blue/60",
  "col-span-3 row-span-3 h-full bg-surface-2",
  "col-span-9 h-full bg-[#e8edff]",
  "col-span-4 h-full bg-[#ffe9ef]",
  "col-span-5 h-full bg-[#e3f5ee]",
  "col-span-9 h-4 w-3/4 bg-surface-2",
];

const SPARKS = [
  { x: "-14px", y: "-12px", delay: "0s" },
  { x: "10px", y: "-16px", delay: "0.3s" },
  { x: "16px", y: "-4px", delay: "0.6s" },
];

export function clockOf(since: string | null, now: number): string | null {
  if (!since) return null;
  const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return now;
}

function Page() {
  return (
    <div
      className="relative overflow-hidden rounded-[9px] bg-[#f3f4f7] p-3"
      style={SCREEN}
    >
      <div className="grid h-full grid-cols-12 grid-rows-[auto_1fr_1fr_auto] gap-1.5 rounded-md bg-card p-2 shadow-[0_1px_4px_rgb(0_0_0/0.08)]">
        {PIECES.map((piece, at) => (
          <div
            key={piece}
            className={cn("rounded-[4px] motion-safe:animate-assemble", piece)}
            style={{ animationDelay: `${String(at * 0.35)}s` }}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent motion-safe:animate-sweep" />
      <div className="absolute right-3 bottom-2">
        <div className="relative motion-safe:animate-hop">
          <KoboldHead size={34} hat={MAKER.hat} color={MAKER.color} />
          {SPARKS.map((spark) => (
            <span
              key={spark.delay}
              className="absolute top-1 left-1 size-1.5 rounded-full bg-[#ffc94d] opacity-0 motion-safe:animate-spark"
              style={
                {
                  "--spark-x": spark.x,
                  "--spark-y": spark.y,
                  animationDelay: spark.delay,
                } as CSSProperties
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// What the kobold does now, in plain words: a raw tool name ("Using
// mcp__…") says nothing to the team, so then the line stays general.
function doing(activity: string | null, fallback: string): string {
  if (!activity || /mcp__/.test(activity)) return fallback;
  return activity;
}

// Tinker's status, said once, small: who is at work, what it does now and its
// clock. Beside the screen it shows in the card's header or its tab bar.
export function MakingStatus({ run }: Readonly<{ run: VersionRun }>) {
  const clock = clockOf(run.since, useNow());
  const t = useT().explore.board;
  const now = doing(run.activity, t.atWork);
  return (
    <span
      role="status"
      title={`${t.building(MAKER.name, run.version)} ${now}`}
      className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-normal text-blue"
    >
      <KoboldHead
        size={16}
        hat={MAKER.hat}
        color={MAKER.color}
        className="flex-none motion-safe:animate-bob"
      />
      <span key={now} className="truncate motion-safe:animate-pop">
        {now}
      </span>
      {clock && (
        <span className="flex-none text-muted-foreground tabular-nums">
          {clock}
        </span>
      )}
    </span>
  );
}

// Before it runs: the page drawing itself, nothing written around it (the
// status says what is going on).
export function Making() {
  return <Page />;
}
