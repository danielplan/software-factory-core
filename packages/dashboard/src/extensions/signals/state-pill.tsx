// A feedback post's state on the board, as a tinted pill: sent, seen,
// planned or done.

import { useTranslation } from "react-i18next";

import type { State } from "@/api/feedback-board";
import { cn } from "@/lib/utils";

const PILL: Record<State, string> = {
  sent: "bg-surface text-muted-foreground",
  seen: "bg-blue/10 text-blue",
  planned: "bg-warning/15 text-warning",
  done: "bg-success/10 text-success",
};

export function StatePill({ state }: Readonly<{ state: State }>) {
  const t = useTranslation().t;
  return (
    <span
      title={t(`feedback.stateHelp.${state}`)}
      className={cn(
        "flex-none rounded-md px-1.5 py-0.5 text-[11px] font-medium",
        PILL[state],
      )}
    >
      {t(`feedback.states.${state}`)}
    </span>
  );
}
