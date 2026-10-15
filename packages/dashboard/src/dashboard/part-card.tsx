import { ChevronDown, ExternalLink } from "lucide-react";

import type { PartView } from "@/api";
import { LABEL, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// One part: its light in a small tile, its name and what it is doing, its
// link and buttons, and its problem below.
export function PartCard({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  const status =
    part.step ??
    (part.outside ? "Running, started outside the factory" : LABEL[part.light]);
  return (
    <div
      data-light={part.light}
      title={part.does}
      className="grid gap-3 rounded-2xl border border-border-soft bg-surface py-3.5 pr-3.5 pl-4"
    >
      <div className="flex min-h-[68px] items-center gap-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-[11px] bg-card shadow-soft">
          <StatusLight light={part.light} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-medium">{part.name}</span>
          <span className="text-xs text-muted-foreground">
            {part.light === "starting" && part.step
              ? `Starting · ${part.step}`
              : status}
          </span>
        </span>
        <PartButtons part={part} onPress={onPress} />
      </div>
      {part.problem && <PartProblem problem={part.problem} />}
    </div>
  );
}

function PartProblem({
  problem,
}: Readonly<{ problem: NonNullable<PartView["problem"]> }>) {
  return (
    <div className="grid gap-1 rounded-xl border border-destructive/20 bg-destructive/[0.07] p-3 text-sm">
      <p className="font-medium text-destructive">{problem.title}</p>
      <p className="text-foreground/80">{problem.text}</p>
      {problem.details.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
            Technical details <ChevronDown className="size-3" aria-hidden />
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

// Open, then Start (or Try again after a problem), Restart and Stop, as the
// part allows.
function PartButtons({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  const press = (action: string) => () => {
    onPress(`/api/parts/${encodeURIComponent(part.id)}/${action}`);
  };
  const look = "h-9 rounded-[10px] px-3 text-[13px] font-normal";
  return (
    <div className="flex flex-none flex-wrap justify-end gap-1.5">
      {part.link && (
        <Button asChild variant="outline" className={look}>
          <a href={part.link} target="_blank" rel="noreferrer">
            Open <ExternalLink className="size-3" aria-hidden />
          </a>
        </Button>
      )}
      {part.canStart && (
        <Button variant="outline" className={look} onClick={press("start")}>
          {part.light === "problem" ? "Try again" : "Start"}
        </Button>
      )}
      {part.canStop && (
        <>
          <Button variant="outline" className={look} onClick={press("restart")}>
            Restart
          </Button>
          <Button variant="outline" className={look} onClick={press("stop")}>
            Stop
          </Button>
        </>
      )}
    </div>
  );
}
