import type { TFunction } from "i18next";
import {
  ChevronDown,
  ExternalLink,
  Play,
  RotateCw,
  Square,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { PartView } from "@/api/client";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { problemTitle } from "@/i18n/server-texts";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// One part, compact: its light, name and Open link, what it is doing, its
// buttons, and its problem below; its frame tells how it is. A `tag`, when
// given, sits in the header row right after the name, on the same line (the
// System map's type of part).
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
  tag,
}: Readonly<{
  part: PartView;
  onPress: (path: string) => void;
  tag?: ReactNode;
}>) {
  const t = useTranslation().t;
  // Only what the light does not say: a step, or that it was started
  // elsewhere.
  const step =
    part.light === "starting" && part.step
      ? t("system.part.starting", { step: part.step })
      : part.step;
  const status = step ?? quietStatus(part, t);
  return (
    <div
      data-light={part.light}
      title={part.does}
      className={cn(
        // min-w-0: a long word (a folder's path) wraps instead of widening it.
        "grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5 rounded-xl border bg-surface px-3 py-2.5",
        FRAME[part.light],
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <StatusLight light={part.light} />
        {/* A long name wraps rather than being cut, so the tag beside it
            never hides part of it. */}
        <span className="line-clamp-2 min-w-0 text-[13px] font-medium break-words">
          {part.name}
        </span>
        {tag}
        {part.link && (
          <a
            href={part.link}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground hover:text-foreground hover:underline"
          >
            {t("system.part.open")}{" "}
            <ExternalLink className="size-3" aria-hidden />
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
function quietStatus(part: PartView, says: TFunction): string | null {
  if (part.outside) return says("system.part.outside");
  if (part.start === "with") return says("system.part.withOthers");
  return null;
}

function PartProblem({
  problem,
}: Readonly<{ problem: NonNullable<PartView["problem"]> }>) {
  const t = useTranslation().t;
  return (
    <div className="grid min-w-0 gap-1 rounded-lg border border-destructive/20 bg-destructive/[0.07] p-2.5 text-xs [overflow-wrap:anywhere]">
      <p className="font-medium text-destructive">
        {problemTitle(problem.title, t)}
      </p>
      <p className="text-foreground/80">{problem.text}</p>
      {problem.details.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t("system.part.details")}{" "}
            <ChevronDown className="size-3" aria-hidden />
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
  const t = useTranslation().t;
  if (!part.canStart && !part.canStop) return null;
  const look = "h-7 rounded-lg px-2.5 text-xs font-normal";
  return (
    <div className="flex flex-wrap gap-1.5">
      {part.canStart && (
        <Button variant="outline" className={look} onClick={press("start")}>
          <Play aria-hidden />
          {part.light === "problem"
            ? t("system.part.tryAgain")
            : t("system.part.start")}
        </Button>
      )}
      {part.canStop && (
        <>
          <Button variant="outline" className={look} onClick={press("restart")}>
            <RotateCw aria-hidden />
            {t("system.part.restart")}
          </Button>
          <Button variant="outline" className={look} onClick={press("stop")}>
            <Square aria-hidden />
            {t("system.part.stop")}
          </Button>
        </>
      )}
    </div>
  );
}
