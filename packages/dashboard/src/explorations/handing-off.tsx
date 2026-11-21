// While an exploration is handed off: a small card over the page with
// Doodle, the explorer, writing it up, and the step it is at (the spec,
// the card, the prototypes stopped) with for how long. It cannot be
// closed: the exploration is done, and the card goes when the hand-off
// does.

import { Pencil } from "lucide-react";

import type { ExplorationPage } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/i18n/use-t";
import { KOBOLDS } from "@/lib/kobolds";

import { clockOf, useNow } from "./board/prototype-making";

type Handing = NonNullable<ExplorationPage["handingOff"]>;

const STAGES: Handing["stage"][] = ["spec", "card", "prototypes"];

export function HandingOff({ handing }: Readonly<{ handing: Handing }>) {
  const t = useT().explore;
  const clock = clockOf(handing.since, useNow());
  const step = t.handOffStages[handing.stage];
  const at = STAGES.indexOf(handing.stage) + 1;
  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          event.preventDefault();
        }}
        className="grid w-[300px] max-w-none justify-items-center gap-3 px-6 pt-8 pb-6 text-center sm:max-w-none"
      >
        <DoodleWriting />
        <DialogTitle
          key={step}
          className="text-[15px] leading-snug motion-safe:animate-pop"
        >
          {step}
        </DialogTitle>
        <span className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {t.handOffStep(at, STAGES.length)}
          {clock && <span>· {clock}</span>}
        </span>
      </DialogContent>
    </Dialog>
  );
}

// Doodle with its beret, bobbing, and a pencil writing lines on a sheet.
function DoodleWriting() {
  const doodle = KOBOLDS.find((kobold) => kobold.id === "explorer");
  return (
    <div aria-hidden className="relative h-[76px] w-[120px]">
      <KoboldHead
        size={52}
        hat={doodle?.hat ?? "beret"}
        color={doodle?.color ?? "#e9a23b"}
        className="absolute top-2 left-0 motion-safe:animate-bob"
      />
      <div className="absolute right-0 bottom-0 grid h-[62px] w-[54px] content-start gap-[7px] rounded-md bg-card px-2 pt-3 shadow-[0_4px_14px_-4px_rgb(20_24_36/0.35)]">
        {[0, 1, 2].map((line) => (
          <span
            key={line}
            className="block h-[3px] origin-left rounded-full bg-muted-foreground/30 motion-safe:animate-[write_2.4s_ease-in-out_infinite]"
            style={{ animationDelay: `${String(line * 0.8)}s` }}
          />
        ))}
        <Pencil className="absolute -right-1 bottom-2 size-4 text-wash-foreground motion-safe:animate-[scribble_0.8s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
