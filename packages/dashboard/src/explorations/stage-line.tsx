// How far an exploration is, as a small line of steps: done in green, the
// one it is at in the accent, the rest grey.

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { STAGES } from "./kinds";

export function StageLine({ at }: Readonly<{ at: number }>) {
  return (
    <ol
      aria-label={`At: ${STAGES[at] ?? ""}`}
      className="flex flex-wrap items-center gap-1"
    >
      {STAGES.map((name, n) => (
        <li key={name} className="flex items-center gap-1">
          {n > 0 && (
            <span
              className={cn("h-px w-3", n <= at ? "bg-[#12a594]" : "bg-border")}
            />
          )}
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium",
              n < at && "bg-[#e6f6f3] text-[#0d7a6d]",
              n === at && "bg-wash text-wash-foreground ring-1 ring-current/30",
              n > at && "text-faint",
            )}
          >
            {n < at && <Check className="size-3" aria-hidden />}
            {name}
          </span>
        </li>
      ))}
    </ol>
  );
}
