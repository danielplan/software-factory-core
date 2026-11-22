// An exploration waiting in Explorations › Waiting: what it is about, its
// personas and signals, Start, and a bin that drops it.

import { CircleAlert, Play } from "lucide-react";
import { useState } from "react";

import { type ExplorationRow, messageOf, post } from "@/api/client";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROW } from "@/components/page-bits";

import { Faces } from "./bits";
import { RemoveRow } from "./remove-row";
import { useT } from "@/i18n/use-t";

export const explorationHash = (id: string) =>
  `#explore/${encodeURIComponent(id)}`;

export function Waiting({ row }: Readonly<{ row: ExplorationRow }>) {
  const t = useT();
  const [problem, setProblem] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  return (
    <div className={cn(ROW, "transition-colors hover:bg-surface")}>
      <span className="grid size-9 flex-none place-items-center rounded-xl bg-[#fdf1d8] text-[#8a5a12]">
        <CircleAlert aria-hidden className="size-[18px]" />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-semibold">{row.title}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          <Markdown text={row.problem} inline />
        </span>
        {problem && (
          <span role="alert" className="text-[12.5px] text-destructive">
            {problem}
          </span>
        )}
      </span>
      <Faces personas={row.personas} size={26} />
      {row.signals > 0 && (
        <span className="inline-flex h-6 items-center rounded-full bg-[#e8f0fe] px-2 text-xs font-medium text-[#2948bc]">
          {t.words.signalCount(row.signals)}
        </span>
      )}
      <Button
        variant="ring"
        size="pill-sm"
        onClick={() => {
          post("/api/kobble/explorations/start", { id: row.id }).then(
            () => {
              window.location.hash = explorationHash(row.id);
            },
            (error: unknown) => {
              setProblem(messageOf(error));
            },
          );
        }}
      >
        <Play aria-hidden />
        {t.explore.start}
      </Button>
      <RemoveRow
        path="/api/kobble/explorations/drop"
        body={{ id: row.id }}
        what={t.explore.dropIt}
        onGone={setGone}
        onProblem={setProblem}
      />
    </div>
  );
}
