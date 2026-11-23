// A prototype while Tinker, Doodle's maker, makes it, before it runs: its
// page drawing itself piece by piece with a light sweeping over it, Tinker
// hopping at its work, what it does now, and how long it has been at it. Once it runs,
// the live screen shows instead, with one line of what the kobold does.
// Motion only when the computer allows it.

import { type CSSProperties, useEffect, useState } from "react";

import type { VersionRun } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { reportTinker } from "@/components/meet/meet";
import { NameTag } from "@/components/meet/name-tag";
import { Face } from "@/components/meet/team-panel";
import { MAKER } from "@/lib/kobolds";
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

// About how long is left of a version being made (made up: three minutes).
function aboutOf(since: string | null, now: number): string {
  const seconds = since ? Math.floor((now - Date.parse(since)) / 1000) : 0;
  return `about ${String(Math.max(1, 3 - Math.floor(seconds / 60)))} min`;
}

// The one grey line of Tinker's tag.
function tinkerLine(run: VersionRun, soon: string): string {
  return `Making variant ${run.version} to try · ${soon} · nothing to do until it's ready`;
}

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
        <div className="group/tinker -m-3 p-3">
          <div className="relative motion-safe:animate-hop motion-safe:group-hover/tinker:animate-none">
            <Face id="maker" className="-m-2 p-2">
              <KoboldHead size={34} hat={MAKER.hat} color={MAKER.color} />
            </Face>
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
    </div>
  );
}

// While it runs and is made at once: one line above the live screen, with
// what the kobold does now and its clock.
export function MakingLine({ run }: Readonly<{ run: VersionRun }>) {
  useTinkerNow(run);
  const soon = aboutOf(run.since, useNow());
  if (!(run.state === "running" && run.url)) return null;
  return <NameTag id="maker" line={tinkerLine(run, soon)} />;
}

// What Tinker does now, for the team panel, while this card makes a version.
function useTinkerNow(run: VersionRun) {
  const line = run.making
    ? `Version ${run.version}: ${run.activity ?? "at work"}`
    : null;
  useEffect(() => {
    reportTinker(line);
    return () => {
      reportTinker(null);
    };
  }, [line]);
}

export function Making({ run }: Readonly<{ run: VersionRun }>) {
  useTinkerNow(run);
  const soon = aboutOf(run.since, useNow());
  return (
    <div className="grid gap-2.5">
      <Page />
      <NameTag id="maker" line={tinkerLine(run, soon)} />
    </div>
  );
}
