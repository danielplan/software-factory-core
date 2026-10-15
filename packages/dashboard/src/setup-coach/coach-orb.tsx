import { cn } from "@/lib/utils";

// The coach: a soft orb of the pastel glows, turning while it thinks.
export function CoachOrb({ working }: Readonly<{ working: boolean }>) {
  return (
    <span
      aria-hidden
      className={cn("orb size-10 flex-none", working && "animate-swirl")}
    />
  );
}
