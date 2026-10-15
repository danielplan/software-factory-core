import { ChevronDown, ExternalLink } from "lucide-react";

import type { PartView } from "@/api";
import { LABEL, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const FRAME: Record<PartView["light"], string> = {
  running: "border-success/40",
  starting: "border-primary shadow-[0_0_0_4px_var(--glow)]",
  problem: "border-destructive",
  stopped: "",
  none: "",
};

// One part: its light, what it does, what it is doing, its problem, its
// link and its buttons.
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
      className={cn(
        "grid gap-2 rounded-xl border bg-card p-4",
        FRAME[part.light],
      )}
    >
      <div className="flex items-center gap-2 font-semibold">
        <StatusLight light={part.light} />
        <span className="truncate">{part.name}</span>
        {part.link && (
          <a
            href={part.link}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs font-normal text-link hover:underline"
          >
            Open <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{part.does}</p>
      {status && <p className="text-xs text-muted-foreground">{status}</p>}
      {part.problem && <PartProblem problem={part.problem} />}
      <PartButtons part={part} onPress={onPress} />
    </div>
  );
}

function PartProblem({
  problem,
}: Readonly<{ problem: NonNullable<PartView["problem"]> }>) {
  return (
    <div className="grid gap-1 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
      <p className="font-medium">{problem.title}</p>
      <p>{problem.text}</p>
      {problem.details.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline">
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

// Start (or Try again after a problem), Restart and Stop, as the part allows.
function PartButtons({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  if (!part.canStart && !part.canStop) return null;
  const press = (action: string) => () => {
    onPress(`/api/parts/${encodeURIComponent(part.id)}/${action}`);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {part.canStart && (
        <Button size="xs" variant="outline" onClick={press("start")}>
          {part.light === "problem" ? "Try again" : "Start"}
        </Button>
      )}
      {part.canStop && (
        <>
          <Button size="xs" variant="outline" onClick={press("restart")}>
            Restart
          </Button>
          <Button size="xs" variant="outline" onClick={press("stop")}>
            Stop
          </Button>
        </>
      )}
    </div>
  );
}
