// Home's arrangement, one for the whole team: read from the factory's files
// (and again when they change) and kept there when the person arranges it.
// What the person does shows at once; what the files say wins when somebody
// else changed them.

import { useEffect, useRef, useState } from "react";

import { type AddOnView, type FactoryState, post } from "@/api/client";
import { useExplorations } from "@/api/use-explorations";
import { type Layout, layoutFrom } from "@/lib/home-layout";
import { type HomeInput } from "@/lib/home-view";
import { useRead } from "@/api/use-read";
import { useSignals } from "@/api/use-signals";

const keyOf = (layout: Layout | null): string =>
  layout ? `${layout.order.join(",")}|${layout.hidden.join(",")}` : "";

export function useHomeLayout(addOns: AddOnView[]) {
  const { data, problem } = useRead("/api/home-layout");
  const kept = (data as { layout: Layout | null } | null)?.layout ?? null;
  const [mine, setMine] = useState<Layout | null>(null);
  // What the files said last, so only a change by somebody else replaces
  // what the person just did.
  const said = useRef<string | null>(null);
  const [problemKeeping, setProblemKeeping] = useState(false);
  useEffect(() => {
    if (data === null) return;
    if (keyOf(kept) !== said.current) {
      said.current = keyOf(kept);
      setMine(null);
    }
  }, [data, kept]);
  const layout = mine ?? layoutFrom(kept, addOns);
  const change = (next: Layout) => {
    setMine(next);
    said.current = keyOf(next);
    setProblemKeeping(false);
    post("/api/home-layout", next).catch(() => {
      setProblemKeeping(true);
    });
  };
  return {
    layout,
    change,
    // Home waits for the team's arrangement before it shows its blocks, so
    // they come once, in their place.
    loaded: data !== null || problem !== null,
    problemKeeping,
  };
}

// What the blocks show beyond the factory's own state: the ideas being
// explored and the signals; `read` once both have been read (or failed).
export function useHomeInput(state: FactoryState) {
  const { data: explorations, problem: exploringProblem } = useExplorations();
  const { data: signals, problem: signalsProblem } = useSignals();
  const input: HomeInput = {
    work: state.work,
    signals: signals?.signals ?? [],
    fresh: signals?.counts.new ?? 0,
    exploring: explorations?.exploring ?? [],
  };
  const read =
    (explorations !== null || exploringProblem !== null) &&
    (signals !== null || signalsProblem !== null);
  return { input, read };
}
