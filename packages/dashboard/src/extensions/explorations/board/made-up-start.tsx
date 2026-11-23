// Variant D, "No button, it just starts": Tinker worked out how to start the
// app while making the prototype, so Start works as usual and the starting
// steps show. This project has no start command, so nothing really runs
// here: the starting steps and the screen are made up, and say so.

import { Sparkles } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import type { VersionRun } from "@/api/client";

import { STATE, VARIANT } from "./prototype-variant";

type Step = "idle" | "copy" | "command" | "running";

const AFTER: Record<string, Step> = { copy: "command", command: "running" };
const WAIT: Record<string, number> = { copy: 1500, command: 2200 };

function firstStep(): Step {
  if (STATE === "starting") return "command";
  if (STATE === "running") return "running";
  return "idle";
}

// Whether the made-up start stands in for the real one: variant D, in a
// project that cannot start prototypes, unless Tinker is shown failing.
export function madeUpStart(canRun: boolean): boolean {
  return VARIANT === "D" && !canRun && STATE !== "problem";
}

// Which prototype started first this way: only it carries Tinker's line,
// since what Tinker set up is kept for the whole team once, not per prototype.
let first: string | null = null;
const listeners = new Set<() => void>();

function claim(key: string, byAddress: boolean) {
  // Started by hand: the first to start. Picked by the address: the first
  // prototype on the board.
  if (first === null || (byAddress && key < first)) {
    first = key;
    listeners.forEach((one) => {
      one();
    });
  }
}

function useFirst(): string | null {
  return useSyncExternalStore(
    (listen) => {
      listeners.add(listen);
      return () => {
        listeners.delete(listen);
      };
    },
    () => first,
  );
}

export function useMadeUpStart(key: string) {
  const [step, setStep] = useState<Step>(firstStep);
  const shown = useFirst();
  useEffect(() => {
    if (firstStep() !== "idle" && madeUpStart(true)) claim(key, true);
  }, [key]);
  const [since, setSince] = useState(() => new Date().toISOString());
  useEffect(() => {
    // A state picked by the address stays as it is.
    if (STATE || !(step in AFTER)) return;
    const timer = setTimeout(() => {
      setStep(AFTER[step] ?? "running");
    }, WAIT[step]);
    return () => {
      clearTimeout(timer);
    };
  }, [step]);
  const run: VersionRun | undefined =
    step === "copy" || step === "command"
      ? {
          idea: "",
          version: "",
          state: "starting",
          making: false,
          url: null,
          activity: null,
          since: null,
          steps: [],
          problem: null,
          start: {
            step,
            line: step === "command" ? "ready in 412 ms (made up)" : null,
            since,
          },
        }
      : undefined;
  return {
    run,
    running: step === "running",
    // Tinker's line, on the first prototype that started this way.
    line: shown === key && step !== "idle",
    start: () => {
      claim(key, false);
      setSince(new Date().toISOString());
      setStep("copy");
    },
  };
}

// What the made-up run shows instead of the app.
export function MadeUpScreen({
  style,
}: Readonly<{ style: React.CSSProperties }>) {
  return (
    <div
      className="grid place-items-center rounded-[9px] bg-[#f3f4f7]"
      style={style}
    >
      <div className="flex h-36 w-[300px] flex-col gap-2.5 rounded-lg bg-card p-3.5 shadow-[0_1px_4px_rgb(0_0_0/0.1)]">
        <div className="h-[6px] w-1/2 rounded-[3px] bg-[#cfe0ff]" />
        {[0, 1, 2].map((line) => (
          <div key={line} className="h-2 rounded-[3px] bg-[#f0f1f4]" />
        ))}
        <p className="mt-auto text-[11px] text-muted-foreground">
          Made up: here the running app shows.
        </p>
      </div>
    </div>
  );
}

// The calm line: what Tinker did, and what happens to it.
export function TinkerLine() {
  return (
    <p className="flex items-start gap-1.5 text-xs text-foreground-2">
      <Sparkles aria-hidden className="mt-0.5 size-3 flex-none text-blue" />
      Tinker set up how to start your app, for the whole team.
    </p>
  );
}
