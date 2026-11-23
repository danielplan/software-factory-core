// What the explorer does now, in everyday words: the same step in the chat,
// the header and the board card. The server says what kind of action it is
// (`talk.doing`) and where the turn is (`talk.step`); the words are here, in
// each language. While it works, each step stays on show a few seconds, and
// the stage moves with its step so the two never disagree.

import { useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import type { ExplorationPage } from "@/api/client";

import type { DoingKind, Stage } from "../../../../core/src/kobble/doing.ts";
import { type Clock, Steady } from "./steady";

type Talk = Pick<ExplorationPage["talk"], "step" | "doing" | "writing">;

type Held = { stage: Stage; kind: DoingKind | null };

// How long a step stays on show before the next one replaces it.
export const HOLD_MS = 3000;

const clock: Clock = {
  now: () => Date.now(),
  later: (run, ms) => {
    const timer = setTimeout(run, ms);
    return () => {
      clearTimeout(timer);
    };
  },
};

// One for the page: all three places read it, so they change together.
const held = new Steady<Held>(
  { stage: 0, kind: null },
  HOLD_MS,
  clock,
  (a, b) => a.stage === b.stage && a.kind === b.kind,
);

export type Doing = {
  // The stage it is at, 0 to 2.
  stage: Stage;
  // The words for the step, in the language of the page; null when it works
  // on nothing.
  line: string | null;
};

export function useDoing(talk: Talk): Doing {
  const t = useTranslation().t;
  const working = talk.writing !== null;
  const { step, doing } = talk;
  useEffect(() => {
    const now = { stage: step, kind: doing };
    if (working) held.offer(now);
    else held.reset(now);
  }, [working, step, doing]);
  const shown = useSyncExternalStore(held.subscribe, held.get);
  // Once the turn is over what shows is where it ended, without waiting.
  const now = working ? shown : { stage: step, kind: doing };
  // It opens straight on a step: before any action, it is getting ready.
  const kind = now.kind ?? (working ? "start" : null);
  return { stage: now.stage, line: kind ? t(`explore.doing.${kind}`) : null };
}
