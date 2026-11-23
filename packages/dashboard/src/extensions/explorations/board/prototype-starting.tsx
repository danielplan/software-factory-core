// A prototype while it starts: a spinner, what it is doing (its copy of the
// code made, then its start command, with the command's latest line), and
// how long it has taken, over the sketch of its page, which pulses.

import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { VersionRun } from "@/api/client";
import { MAKER } from "@/lib/kobolds";

import { clockOf, useNow } from "./prototype-making";

export function Starting({ run }: Readonly<{ run: VersionRun }>) {
  const t = useTranslation().t;
  const clock = clockOf(run.start?.since ?? null, useNow());
  const step =
    run.start?.line ??
    {
      command: t("explore.board.runningStart"),
      setup: t("explore.board.settingUpStart", { name: MAKER.name }),
      copy: t("explore.board.preparingCopy"),
    }[run.start?.step ?? "copy"];
  return (
    <div
      role="status"
      className="nodrag absolute z-10 grid w-[300px] gap-1.5 rounded-xl bg-card px-4 py-3 shadow-[0_8px_24px_-10px_rgb(20_24_36/0.45)]"
    >
      <span className="flex items-center gap-2 text-[13px] font-medium">
        <LoaderCircle aria-hidden className="size-4 animate-spin text-blue" />
        {t("explore.board.startingTitle")}
        {clock && (
          <span className="ml-auto text-xs font-normal text-muted-foreground tabular-nums">
            {clock}
          </span>
        )}
      </span>
      <span
        key={step}
        title={step}
        className="truncate text-xs text-muted-foreground motion-safe:animate-pop"
      >
        {step}
      </span>
    </div>
  );
}
