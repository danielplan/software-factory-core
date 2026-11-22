// A small coloured tag in a part's box on the System map saying what type of
// part it is: Screen, Backend, Data or Outside service, each with its own
// colour and icon.

import {
  Cloud,
  Database,
  type LucideIcon,
  Monitor,
  Server,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";

import type { PartView } from "@/api/client";
import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

type PartType = NonNullable<PartView["type"]>;

// Each type's icon and colours on its tag.
const LOOK: Record<PartType, { icon: LucideIcon; look: string }> = {
  screen: { icon: Monitor, look: "bg-sky-50 text-sky-700 ring-sky-200" },
  backend: {
    icon: Server,
    look: "bg-violet-50 text-violet-700 ring-violet-200",
  },
  data: { icon: Database, look: "bg-amber-50 text-amber-800 ring-amber-200" },
  outside: { icon: Cloud, look: "bg-rose-50 text-rose-700 ring-rose-200" },
};

// A small coloured tag saying what type of part it is. Pointing at it,
// focusing it or tapping it tells what that type means; only this tag's.
export function TypeTag({ type }: Readonly<{ type: PartType }>) {
  const { label, means } = useT().system.types[type];
  const { icon: Icon, look } = LOOK[type];
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        // Not the box's own hint (what the part does), only this tag's.
        title=""
        aria-label={`${label}: ${means}`}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
        onFocus={() => {
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
        }}
        // A tap (or click) opens it rather than toggling it, since the
        // focus that comes with it has opened it already.
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 cursor-help items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] leading-none font-medium ring-1 outline-none focus-visible:ring-2",
          look,
        )}
      >
        <Icon className="size-3" aria-hidden />
        {label}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={6}
          // The tag keeps the focus; the hint only tells.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
          }}
          className="z-50 max-w-56 rounded-md bg-foreground px-2.5 py-1.5 text-xs text-background shadow-md"
        >
          <span className="font-medium">{label}</span>: {means}
          <Popover.Arrow className="fill-foreground" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
