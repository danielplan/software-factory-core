// Who talks in an exploration: the explorer kobold, on a tile of its
// colour, with its name and what it does now.

import type { ExplorationPage } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { KOBOLDS } from "@/lib/kobolds";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";
import type { Messages } from "@/i18n/messages";

// What the explorer does now, in a few words: answering, a step of its
// work, a version being made, or what it is for when it waits.
function doingOf(
  page: ExplorationPage,
  says: Messages["explore"]["talk"],
): string | null {
  const { talk } = page;
  if (talk.writing !== null)
    return talk.writing ? says.talking : (talk.activity ?? says.thinking);
  const making = page.runs.find((run) => run.making);
  return making ? says.making(making.version) : null;
}

// Who talks here: the explorer kobold on a tile of its colour, its name and
// what it does now; while it works it bobs and its line breathes.
export function Who({ page }: Readonly<{ page: ExplorationPage }>) {
  const explorer = KOBOLDS.find((kobold) => kobold.id === "explorer");
  const t = useT().explore.talk;
  const doing = doingOf(page, t);
  const color = explorer?.color ?? "#e9a23b";
  return (
    <div className="flex items-center gap-3 border-b border-border-soft px-5 py-3.5">
      <span
        className="relative grid size-11 flex-none place-items-center rounded-[13px]"
        style={{ background: `${color}24` }}
      >
        <KoboldHead
          size={34}
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
      <span className="grid min-w-0">
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            {explorer?.name}
          </span>
          <span className="text-[11.5px] text-faint">{t.yourExplorer}</span>
        </span>
        <span
          className={cn(
            "truncate text-xs",
            doing ? "font-medium" : "text-muted-foreground",
          )}
          style={doing ? { color } : undefined}
        >
          {doing ?? t.role}
        </span>
      </span>
    </div>
  );
}
