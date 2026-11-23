// Who talks in an exploration: the explorer kobold, on a tile of its
// colour, with its name and what it does now.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { ExplorationPage } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { VARIANT } from "@/components/meet/meet";
import { Face } from "@/components/meet/team-panel";
import { KOBOLDS } from "@/lib/kobolds";
import { cn } from "@/lib/utils";

// What the explorer does now, in a few words: answering or a step of its
// work; nothing when it waits. A prototype being made shows on its card on
// the board, with what the maker does, not here a second time.
function doingOf(page: ExplorationPage, says: TFunction): string | null {
  const { talk } = page;
  if (talk.writing === null) return null;
  return talk.writing
    ? says("explore.talk.talking")
    : (talk.activity ?? says("explore.talk.thinking"));
}

// Who talks here: the explorer kobold on a tile of its colour, its name and
// what it does now; while it works it bobs and its line breathes.
export function Who({ page }: Readonly<{ page: ExplorationPage }>) {
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  const t = useTranslation().t;
  const doing = doingOf(page, t);
  const color = explorer?.color ?? "#e9a23b";
  // A bit bigger in variant E, where the kobolds are always present.
  const big = VARIANT === "E";
  return (
    <div className="flex items-center gap-3 border-b border-border-soft px-5 py-3.5">
      <Face id="explorer" className="flex-none rounded-[15px]">
        <span
          className={cn(
            "relative grid flex-none place-items-center rounded-[13px]",
            big ? "size-14" : "size-11",
          )}
          style={{ background: `${color}24` }}
        >
          <KoboldHead
            size={big ? 44 : 34}
            hat={explorer?.hat}
            color={color}
            className={doing ? "motion-safe:animate-bob" : undefined}
          />
          {doing && (
            <span
              className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card motion-safe:animate-breathe"
              style={{ background: color }}
            />
          )}
        </span>
      </Face>
      <span className="grid min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            {explorer?.name}
          </span>
          <span className="text-[11.5px] text-faint">
            {t("explore.talk.yourExplorer")}
          </span>
        </span>
        <span
          className={cn(
            "truncate text-xs",
            doing ? "font-medium" : "text-muted-foreground",
          )}
          style={doing ? { color } : undefined}
        >
          {doing ?? t("explore.talk.role")}
        </span>
      </span>
    </div>
  );
}
