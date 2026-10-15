import type { Light } from "@/api";
import { cn } from "@/lib/utils";

export const LABEL: Record<Light, string> = {
  running: "Running",
  stopped: "Stopped",
  starting: "Starting",
  problem: "Problem",
  none: "",
};

const LOOK: Record<Light, string> = {
  running: "border-success bg-success",
  stopped: "border-muted-foreground",
  starting: "animate-spin border-primary border-t-transparent",
  problem: "border-destructive bg-destructive",
  none: "hidden",
};

export function StatusLight({
  light,
  className,
}: Readonly<{ light: Light; className?: string }>) {
  return (
    <i
      role="img"
      aria-label={LABEL[light] || undefined}
      className={cn(
        "inline-block size-2.5 flex-none rounded-full border-2",
        LOOK[light],
        className,
      )}
    />
  );
}
