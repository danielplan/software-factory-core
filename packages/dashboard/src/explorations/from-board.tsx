// An idea in the board's Backlog, in Explorations › Waiting (the Factory
// page shows agreed work only).

import { Lightbulb, Play } from "lucide-react";
import { useState } from "react";

import { type ExplorationsView, messageOf, post } from "@/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ROW } from "@/signals/bits";

import { RemoveRow } from "./remove-row";
import { useT } from "@/i18n/use-t";

// An idea in the board's Backlog: not agreed work, so it waits here.
// Starting it makes an exploration of it; handing that off fills in this
// same issue and moves it to To do. Not wanted: deleted like a card
// (closed as not planned, off the board).
export function FromBoard({
  idea,
}: Readonly<{ idea: ExplorationsView["fromBoard"][number] }>) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const start = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const { exploration } = await post<{ exploration: { id: string } }>(
        "/api/kobble/explorations",
        { title: idea.title, issue: idea.number },
      );
      await post("/api/kobble/explorations/start", { id: exploration.id });
      window.location.hash = `explore/${exploration.id}`;
    } catch (error: unknown) {
      setBusy(false);
      setProblem(messageOf(error));
    }
  };
  if (gone) return null;
  return (
    <div className={cn(ROW, "transition-colors hover:bg-surface")}>
      <span className="grid size-9 flex-none place-items-center rounded-xl bg-[#eef0f4] text-[#4b5563]">
        <Lightbulb aria-hidden className="size-[17px]" />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className="font-semibold">{idea.title}</span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          <a
            href={idea.url}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            #{idea.number}
          </a>{" "}
          · {t.explore.fromBacklog}
        </span>
        {problem && (
          <span role="alert" className="text-[12.5px] text-destructive">
            {problem}
          </span>
        )}
      </span>
      <Button
        variant="ring"
        size="pill-sm"
        busy={busy}
        onClick={() => void start()}
      >
        <Play aria-hidden />
        {busy ? t.explore.starting : t.explore.start}
      </Button>
      <RemoveRow
        path="/api/kobble/factory/delete"
        body={{ number: idea.number }}
        what={t.explore.closeOnGitHub}
        onGone={setGone}
        onProblem={setProblem}
      />
    </div>
  );
}
