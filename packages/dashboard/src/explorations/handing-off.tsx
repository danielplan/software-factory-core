// While an exploration is handed off: a panel over the page with each stage
// (the spec written, the card made, the prototypes stopped), for how long,
// and what the spec writer did; closed, a line in the bar opens it again.

import { Check, Circle, LoaderCircle } from "lucide-react";
import { useState } from "react";

import type { ExplorationPage } from "@/api";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/use-t";

import { clockOf, useNow } from "./board/prototype-making";

type Handing = NonNullable<ExplorationPage["handingOff"]>;

const STAGES = ["spec", "card", "prototypes"] as const;

export function HandingOff({
  handing,
  title,
}: Readonly<{ handing: Handing; title: string }>) {
  const t = useT().explore;
  const [open, setOpen] = useState(true);
  const clock = clockOf(handing.since, useNow());
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
        className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground hover:text-foreground"
      >
        <LoaderCircle aria-hidden className="size-3.5 animate-spin text-blue" />
        <span className="min-w-0 flex-1 truncate">
          {t.handOffStages[handing.stage]}
        </span>
        {clock && <span className="tabular-nums">{clock}</span>}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="grid h-[85vh] w-[min(1100px,calc(100vw-32px))] max-w-none sm:max-w-none grid-rows-[auto_auto_1fr] gap-5">
          <div className="flex items-baseline gap-3 pr-10">
            <DialogTitle className="min-w-0 flex-1 text-base">
              {t.handingOffTitle(title)}
            </DialogTitle>
            {clock && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {clock}
              </span>
            )}
          </div>
          <Stages handing={handing} />
          <Steps steps={handing.steps} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Stages({ handing }: Readonly<{ handing: Handing }>) {
  const t = useT().explore;
  const at = STAGES.indexOf(handing.stage);
  return (
    <ol className="grid gap-2 text-sm">
      {STAGES.map((stage, n) => (
        <li key={stage} className="flex items-center gap-2">
          <StageMark state={stateOf(n, at)} />
          <span className={n > at ? "text-muted-foreground" : undefined}>
            {t.handOffStages[stage]}
          </span>
        </li>
      ))}
    </ol>
  );
}

function stateOf(n: number, at: number): "done" | "now" | "next" {
  if (n < at) return "done";
  return n === at ? "now" : "next";
}

function StageMark({ state }: Readonly<{ state: "done" | "now" | "next" }>) {
  if (state === "done")
    return <Check aria-hidden className="size-4 text-green" />;
  if (state === "now")
    return (
      <LoaderCircle aria-hidden className="size-4 animate-spin text-blue" />
    );
  return <Circle aria-hidden className="size-4 text-muted-foreground" />;
}

function Steps({ steps }: Readonly<{ steps: string[] }>) {
  const t = useT().explore;
  return (
    <div className="min-h-[160px] overflow-y-auto rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
      {steps.length === 0 ? (
        <p>{t.handingOffAbout}</p>
      ) : (
        <ol className="grid gap-0.5">
          {steps.map((step, n) => (
            <li key={`${String(n)}-${step}`} className="truncate" title={step}>
              {step}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
