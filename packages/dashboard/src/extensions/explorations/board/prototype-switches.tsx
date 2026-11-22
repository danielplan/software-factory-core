// The switches on top of a prototype, outside the app: which variant and
// which made-up data it shows, each a labelled row of short segments that
// never wrap, and what the variant shown is, right under its switch.

import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

// A labelled row of segments.
export function SwitchRow({
  label,
  role,
  children,
}: Readonly<{
  label: string;
  role: "tablist" | "group";
  children: ReactNode;
}>) {
  return (
    <div className="nodrag flex items-center gap-2">
      <span className="w-14 flex-none text-[11px] text-muted-foreground">
        {label}
      </span>
      <div
        role={role}
        aria-label={label}
        className="flex flex-wrap gap-0.5 rounded-[9px] bg-[#f3f4f7] p-0.5"
      >
        {children}
      </div>
    </div>
  );
}

// One segment: a letter or a short word, the picked one raised.
export function Segment({
  on,
  role,
  title,
  onPick,
  children,
}: Readonly<{
  on: boolean;
  role?: "tab";
  title?: string;
  onPick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      role={role}
      aria-selected={role ? on : undefined}
      aria-pressed={role ? undefined : on}
      title={title}
      onClick={onPick}
      className={cn(
        "inline-flex h-6 min-w-7 items-center justify-center gap-1 rounded-[7px] px-2 text-xs",
        on
          ? "bg-card font-semibold text-foreground shadow-[0_1px_2px_rgb(20_24_36/0.12)]"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

// What the variant shown is: its letter and name, and how it differs.
export function ShownVariant({
  letter,
  name,
  difference,
}: Readonly<{ letter?: string; name?: string; difference: string }>) {
  if (!name && !difference) return null;
  return (
    <div className="flex gap-2 rounded-[9px] bg-[#f6f7f9] px-2.5 py-2 text-xs">
      <Info aria-hidden className="mt-0.5 size-3.5 flex-none text-faint" />
      <div className="grid min-w-0 gap-0.5">
        {name && (
          <span className="font-semibold text-foreground">
            {letter ? `${letter} · ${name}` : name}
          </span>
        )}
        {difference && (
          <div className="text-muted-foreground">
            <Markdown text={difference} />
          </div>
        )}
      </div>
    </div>
  );
}
