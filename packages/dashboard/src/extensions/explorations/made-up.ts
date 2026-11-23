// PROTOTYPE (X-18, A): a made-up exploration with the kobold thinking, so the
// ways of saying what it does can be seen without a running factory. Chosen
// by the page address: ?state=thinking (the usual), problem (it stops) or
// long (a long path in its step). The steps are what the factory reports, the
// lines in its own words are what Doodle would write before it looks.

import { useEffect, useMemo, useState } from "react";

import type { ExplorationPage } from "@/api/client";

import { MADE_UP_STATE, VARIANT } from "./doing";

const LONG =
  "Reading packages/dashboard/src/extensions/explorations/board/prototype-switches-and-the-states-of-every-variant-in-one-long-name.tsx";

// Each step stays a few seconds. The first is a step already, so the page
// never starts on "Thinking…": in C, the kobold's own line comes first.
const STEPS: { activity: string | null; step: 0 | 1 | 2 }[] = [
  {
    activity:
      VARIANT === "C"
        ? "Let me check how products are described"
        : "Reading packages/dashboard/product.json",
    step: 0,
  },
  { activity: "Looking for files **/product.json", step: 1 },
  { activity: "Now, how ideas are kept", step: 1 },
  { activity: "Searching for “exploration”", step: 1 },
  { activity: "Reading docs/reference/design-system.md", step: 1 },
  { activity: "Looking through files: src/extensions/explorations", step: 1 },
  { activity: "I'll draw two ways to say it", step: 2 },
  { activity: "Using add choice (setup)", step: 2 },
];
const EACH = 3600;

function pageAt(at: number, state: string): ExplorationPage {
  const now = STEPS[at] ?? STEPS[0];
  const stopped = state === "problem";
  const activity =
    state === "long" && at === 4 ? LONG : (now?.activity ?? null);
  return {
    exploration: {
      id: "X-18",
      title: "What the kobold is doing, in plain words",
      status: "exploring",
      personas: [],
      signals: [],
      heard: [],
      problem:
        "While Doodle thinks about an idea, the chat shows its raw steps.",
      created: "2026-11-23T09:00:00.000Z",
      work: null,
    },
    personas: [],
    heard: [],
    board: {
      things: [
        { id: "problem", kind: "problem", agreed: false, place: null, by: "kobold" },
      ],
      links: [],
    },
    runs: [],
    canRun: false,
    tests: {},
    talk: {
      messages: [
        {
          from: "you",
          text: "Doodle, how should it say what it is doing while it thinks? Made-up conversation.",
        },
      ],
      writing: "",
      activity,
      step: now?.step ?? 0,
      problem: stopped && at >= 4 ? "Doodle stopped: made-up problem. Try again." : null,
      pointed: null,
    },
    handingOff: null,
    unmade: [],
  } as unknown as ExplorationPage;
}

// The made-up page, going through the steps again and again; null when the
// address asks for none.
export function useMadeUp(): ExplorationPage | null {
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!MADE_UP_STATE) return;
    const timer = setInterval(() => {
      setAt((now) => (now + 1) % (STEPS.length + 2));
    }, EACH);
    return () => {
      clearInterval(timer);
    };
  }, []);
  return useMemo(
    () =>
      MADE_UP_STATE
        ? pageAt(Math.min(at, STEPS.length - 1), MADE_UP_STATE)
        : null,
    [at],
  );
}
