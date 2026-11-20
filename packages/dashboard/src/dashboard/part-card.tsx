import { ChevronDown, ExternalLink } from "lucide-react";

import type { PartView } from "@/api";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

// How a card stands to the card under the pointer: the card itself, a part
// it needs, a part that uses it, or none of these (faded).
export type Mark = "self" | "needs" | "usedBy" | "apart" | null;

const MARK: Record<Exclude<Mark, null>, string> = {
  self: "border-primary shadow-[0_0_0_4px_var(--tint-line)]",
  needs: "border-primary/70 bg-tint",
  usedBy: "border-success/70 bg-success/[0.06]",
  apart: "opacity-40",
};

// What a part is linked to, by name: what it needs and what uses it.
export type Links = { needs: string[]; usedBy: string[] };

export function PartCard({
  part,
  onPress,
  links,
  mark = null,
  onPoint,
}: Readonly<{
  part: PartView;
  onPress: (path: string) => void;
  links?: Links;
  mark?: Mark;
  // The pointer comes onto the card (its id) or leaves it (null).
  onPoint?: (id: string | null) => void;
}>) {
  // Only what the light does not say: a step, or that it was started
  // elsewhere.
  const step =
    part.light === "starting" && part.step
      ? `Starting · ${part.step}`
      : part.step;
  const status = step ?? quietStatus(part);
  return (
    <div
      data-light={part.light}
      title={part.does}
      onMouseEnter={() => onPoint?.(part.id)}
      onMouseLeave={() => onPoint?.(null)}
      onFocus={() => onPoint?.(part.id)}
      onBlur={() => onPoint?.(null)}
      className={cn(
        "grid gap-1.5 rounded-xl border bg-surface px-3 py-2.5 transition-[opacity,border-color,background-color] duration-150",
        FRAME[part.light],
        mark && MARK[mark],
      )}
    >
      {(mark === "needs" || mark === "usedBy") && (
        <span
          className={cn(
            "text-[11px] font-medium",
            mark === "needs" ? "text-primary" : "text-success",
          )}
        >
          {mark === "needs" ? "Needed by it" : "Uses it"}
        </span>
      )}
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
            Open <ExternalLink className="size-3" aria-hidden />
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
      {links && <PartLinks links={links} />}
      <PartButtons part={part} onPress={onPress} />
      {part.problem && <PartProblem problem={part.problem} />}
    </div>
  );
}

// Its links, in two short lines: what it needs, and what uses it.
function PartLinks({ links }: Readonly<{ links: Links }>) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 border-t border-border-soft pt-1.5 text-xs">
      <dt className="text-muted-foreground">Needs</dt>
      <dd className="min-w-0 text-foreground/80">
        {links.needs.length > 0 ? links.needs.join(", ") : "nothing else"}
      </dd>
      <dt className="text-muted-foreground">Used by</dt>
      <dd className="min-w-0 text-foreground/80">
        {links.usedBy.length > 0 ? links.usedBy.join(", ") : "no other part"}
      </dd>
    </dl>
  );
}

// What a part that is not starting says: started elsewhere, or that it
// runs with what uses it.
function quietStatus(part: PartView): string | null {
  if (part.outside) return "Running, started outside the factory";
  if (part.start === "with") return "Runs with the products that use it";
  return null;
}

function PartProblem({
  problem,
}: Readonly<{ problem: NonNullable<PartView["problem"]> }>) {
  return (
    <div className="grid gap-1 rounded-lg border border-destructive/20 bg-destructive/[0.07] p-2.5 text-xs">
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

// Start (or Try again after a problem), Restart and Stop, as the part
// allows.
function PartButtons({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  const press = (action: string) => () => {
    onPress(`/api/parts/${encodeURIComponent(part.id)}/${action}`);
  };
  if (!part.canStart && !part.canStop) return null;
  const look = "h-7 rounded-lg px-2.5 text-xs font-normal";
  return (
    <div className="flex flex-wrap gap-1.5">
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
