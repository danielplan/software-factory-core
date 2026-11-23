// Who talks in an exploration: the explorer kobold, its face free (a click
// opens the "Your kobolds" panel with it lit), with its name, its role and
// what it does now.

import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import type { ExplorationPage } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { Face } from "@/components/meet/face";
import { KOBOLDS } from "@/lib/kobolds";

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

// Who talks here: the explorer kobold, its name and role always written and
// what it does now; while it works it bobs.
export function Who({ page }: Readonly<{ page: ExplorationPage }>) {
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  const t = useTranslation().t;
  const doing = doingOf(page, t);
  const color = explorer?.color ?? "#e9a23b";
  return (
    <div className="flex items-center gap-3 border-b border-border-soft px-5 py-3.5">
      <Face id="explorer" className="flex-none rounded-[15px]">
        <span className="relative grid size-14 flex-none place-items-center">
          <KoboldHead
            size={44}
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
          <span className="text-xs text-muted-foreground">
            {t("explore.talk.yourExplorer")}
          </span>
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {doing ?? t("explore.talk.role")}
        </span>
      </span>
    </div>
  );
}
