import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

// A card to choose: white, a thin border; when chosen, a dark border and a
// round check badge at its corner.
export function ChoiceCard({
  chosen,
  icon,
  title,
  text,
  onChoose,
  big = false,
}: Readonly<{
  chosen: boolean;
  icon: ReactNode;
  title: string;
  text: string;
  onChoose: () => void;
  big?: boolean;
}>) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={chosen}
      onClick={onChoose}
      className={cn(
        "relative flex gap-3 rounded-[14px] border bg-card text-left text-card-foreground shadow-[0_1px_2px_rgb(27_31_42/0.04)] transition outline-none hover:border-foreground/40 focus-visible:ring-[3px] focus-visible:ring-ring/40",
        big ? "flex-col p-6" : "min-h-[76px] items-center px-[18px] py-4",
        chosen ? "border-[1.5px] border-foreground" : "border-border-soft",
      )}
    >
      <span
        className={cn(
          "flex flex-none items-center justify-center rounded-lg [&_svg]:size-4",
          big ? "size-10 [&_svg]:size-5" : "size-8",
          chosen
            ? "bg-primary text-primary-foreground"
            : "bg-surface-2 text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className={cn("font-medium", big ? "text-lg" : "text-[15px]")}>
          {title}
        </span>
        <span
          className={cn("text-muted-foreground", big ? "text-sm" : "text-xs")}
        >
          {text}
        </span>
      </span>
      {chosen && (
        <span className="absolute -top-[9px] -right-[9px] flex size-[22px] items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      )}
    </button>
  );
}
