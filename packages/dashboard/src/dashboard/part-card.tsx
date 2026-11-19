import { ChevronDown, ExternalLink } from "lucide-react";

import type { PartView } from "@/api";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { problemTitle } from "@/i18n/server-texts";
import { useT } from "@/i18n/use-t";
import type { Messages } from "@/i18n/messages";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// One part, compact: its light, name and Open link, what it is doing, its
// buttons, and its problem below; its frame tells how it is.
const FRAME: Record<PartView["light"], string> = {
  running: "border-success/40",
  starting: "border-primary/60 shadow-[0_0_0_4px_var(--tint-line)]",
  problem: "border-destructive/50",
  stopped: "border-border-soft",
  none: "border-border-soft",
};

export function PartCard({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  const t = useT().system;
  // Only what the light does not say: a step, or that it was started
  // elsewhere.
  const step =
    part.light === "starting" && part.step
      ? t.part.starting(part.step)
      : part.step;
  const status = step ?? quietStatus(part, t.part);
  return (
    <div
      data-light={part.light}
      title={part.does}
      className={cn(
        "grid gap-1.5 rounded-xl border bg-surface px-3 py-2.5",
        FRAME[part.light],
      )}
    >
      <div className="flex items-center gap-2">
        <StatusLight light={part.light} />
        <span className="truncate text-[13px] font-medium">{part.name}</span>
        {part.link && (
          <a
            href={part.link}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
          >
            {t.part.open} <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
      {part.does && (
        <span className="line-clamp-2 text-xs text-foreground/70">
          {part.does}
        </span>
      )}
      {status && (
        <span className="text-xs text-muted-foreground">{status}</span>
      )}
      <PartButtons part={part} onPress={onPress} />
      {part.problem && <PartProblem problem={part.problem} />}
    </div>
  );
}

// What a part that is not starting says: started elsewhere, or that it
// runs with what uses it.
function quietStatus(
  part: PartView,
  says: Messages["system"]["part"],
): string | null {
  if (part.outside) return says.outside;
  if (part.start === "with") return says.withOthers;
  return null;
}

function PartProblem({
  problem,
}: Readonly<{ problem: NonNullable<PartView["problem"]> }>) {
  const t = useT().system;
  return (
    <div className="grid gap-1 rounded-lg border border-destructive/20 bg-destructive/[0.07] p-2.5 text-xs">
      <p className="font-medium text-destructive">
        {problemTitle(problem.title, t.problems)}
      </p>
      <p className="text-foreground/80">{problem.text}</p>
      {problem.details.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t.part.details} <ChevronDown className="size-3" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-1 max-h-40 overflow-auto text-xs whitespace-pre-wrap">
              {problem.details.join("\n")}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// Start (or Try again after a problem), Restart and Stop, as the part
// allows.
function PartButtons({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  const press = (action: string) => () => {
    onPress(`/api/parts/${encodeURIComponent(part.id)}/${action}`);
  };
  const t = useT().system.part;
  if (!part.canStart && !part.canStop) return null;
  const look = "h-7 rounded-lg px-2.5 text-xs font-normal";
  return (
    <div className="flex flex-wrap gap-1.5">
      {part.canStart && (
        <Button variant="outline" className={look} onClick={press("start")}>
          {part.light === "problem" ? t.tryAgain : t.start}
        </Button>
      )}
      {part.canStop && (
        <>
          <Button variant="outline" className={look} onClick={press("restart")}>
            {t.restart}
          </Button>
          <Button variant="outline" className={look} onClick={press("stop")}>
            {t.stop}
          </Button>
        </>
      )}
    </div>
  );
}
