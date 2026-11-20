// A prototype while the kobold makes it, before it runs: its page drawing
// itself piece by piece with a light sweeping over it, the kobold hopping at
// its work, what it does now, and how long it has been at it. Once it runs,
// the live screen shows instead, with one line of what the kobold does.
// Motion only when the computer allows it.

import { type CSSProperties, useEffect, useState } from "react";

import type { VersionRun } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { cn } from "@/lib/utils";

import { SCREEN } from "./prototype-screen";

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

function clockOf(since: string | null, now: number): string | null {
  if (!since) return null;
  const seconds = Math.max(0, Math.floor((now - Date.parse(since)) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes)}:${String(seconds % 60).padStart(2, "0")}`;
}

function useNow(): number {
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
          <KoboldHead size={34} />
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

// While it runs and is made at once: one line above the live screen, with
// what the kobold does now and its clock.
export function MakingLine({ run }: Readonly<{ run: VersionRun }>) {
  const clock = clockOf(run.since, useNow());
  if (!(run.state === "running" && run.url)) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-blue/8 px-2.5 py-1.5 text-xs text-blue">
      <span className="relative flex size-2 flex-none">
        <span className="absolute inline-flex size-full rounded-full bg-blue opacity-60 motion-safe:animate-ping" />
        <span className="relative inline-flex size-2 rounded-full bg-blue" />
      </span>
      <span className="flex-none font-medium">Being made, live:</span>
      <span key={run.activity} className="truncate motion-safe:animate-pop">
        {run.activity ?? "the kobold is at work"}
      </span>
      {clock && (
        <span className="ml-auto flex-none text-muted-foreground tabular-nums">
          {clock}
        </span>
      )}
    </div>
  );
}

export function Making({ run }: Readonly<{ run: VersionRun }>) {
  const clock = clockOf(run.since, useNow());
  return (
    <div className="grid gap-2.5">
      <Page />
      <div className="flex items-center gap-2 text-xs font-medium text-blue">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-blue opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-blue" />
        </span>
        The kobold is making it
        {clock && (
          <span className="ml-auto font-normal text-muted-foreground tabular-nums">
            {clock}
          </span>
        )}
      </div>
      {run.activity && (
        <p
          key={run.activity}
          className="text-xs text-foreground-2 motion-safe:animate-pop"
        >
          {run.activity}
        </p>
      )}
    </div>
  );
}
