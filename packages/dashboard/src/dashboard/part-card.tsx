// A part's pieces, shown on the Product page: what it is doing, in words,
// its buttons, and what went wrong.

import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PartView } from "@/api";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { t } from "@/i18n/i18n";
import { plainProblem } from "@/product/plain-problem";

const LIGHT = {
  running: "product:light.running",
  starting: "product:light.starting",
  stopped: "product:light.stopped",
  problem: "product:light.problem",
  none: "product:light.stopped",
} as const;

// What a part is doing, in words: the step it is at, that it was started
// elsewhere or runs with what uses it, else its light.
export function lightWords(part: PartView): string {
  if (part.step) return part.step;
  if (part.outside) return t("product:status.outside");
  if (part.start === "with") return t("product:status.with");
  return t(LIGHT[part.light]);
}

// What went wrong, in plain words; folders and logs behind "details".
export function PartProblem({
  problem,
}: Readonly<{ problem: NonNullable<PartView["problem"]> }>) {
  const { t: say } = useTranslation("product");
  const plain = plainProblem(problem);
  return (
    <div className="grid min-w-0 gap-1 rounded-lg border border-destructive/20 bg-destructive/[0.07] p-2.5 text-note [overflow-wrap:anywhere]">
      <p className="font-medium text-destructive">{plain.title}</p>
      <p className="text-foreground/80">{plain.text}</p>
      {plain.details.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 text-tag text-muted-foreground underline-offset-2 hover:underline">
            {say("problem.details")}{" "}
            <ChevronDown className="size-3" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="mt-1 max-h-40 overflow-auto text-tag whitespace-pre-wrap">
              {plain.details.join("\n")}
            </pre>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

// Start (or Try again after a problem), Restart and Stop, as the part
// allows.
export function PartButtons({
  part,
  onPress,
}: Readonly<{ part: PartView; onPress: (path: string) => void }>) {
  const { t: say } = useTranslation("product");
  const press = (action: string) => () => {
    onPress(`/api/parts/${encodeURIComponent(part.id)}/${action}`);
  };
  if (!part.canStart && !part.canStop) return null;
  const look = "h-7 rounded-lg px-2.5 text-tag font-normal";
  return (
    <div className="flex flex-wrap gap-1.5">
      {part.canStart && (
        <Button variant="outline" className={look} onClick={press("start")}>
          {part.light === "problem"
            ? say("buttons.tryAgain")
            : say("buttons.start")}
        </Button>
      )}
      {part.canStop && (
        <>
          <Button variant="outline" className={look} onClick={press("restart")}>
            {say("buttons.restart")}
          </Button>
          <Button variant="outline" className={look} onClick={press("stop")}>
            {say("buttons.stop")}
          </Button>
        </>
      )}
    </div>
  );
}
