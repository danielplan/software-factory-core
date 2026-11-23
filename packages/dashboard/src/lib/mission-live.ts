// A running mission in words the page shows: the part of the mission it is
// in, and how long it has been going (extensions/personas/mission-live.tsx).

import type { PersonaTest } from "@/api/client";

export const PHASES = ["ready", "using", "writing"] as const;
export type Phase = (typeof PHASES)[number];

// The part of the mission it is in.
export function phaseOf(
  test: Pick<PersonaTest, "status" | "doing" | "steps">,
): Phase {
  if (test.steps.length > 0) return "writing";
  if (test.status === "running" && test.doing) return "using";
  return "ready";
}

// How long it has been going, as m:ss.
export function elapsed(from: string | null, now: number): string {
  if (!from) return "0:00";
  const seconds = Math.max(0, Math.floor((now - Date.parse(from)) / 1000));
  const rest = seconds % 60;
  return `${String(Math.floor(seconds / 60))}:${rest < 10 ? "0" : ""}${String(rest)}`;
}
