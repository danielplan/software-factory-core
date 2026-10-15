import type { Light } from "@/api";
import { cn } from "@/lib/utils";

export const LABEL: Record<Light, string> = {
  running: "Running",
  stopped: "Stopped",
  starting: "Starting",
  problem: "Problem",
  none: "",
};

// Each light's colour, with a soft ring of the same colour around the dot.
const LOOK: Record<Light, string> = {
  running:
    "bg-success shadow-[0_0_0_5px_color-mix(in_srgb,var(--success)_15%,transparent)]",
  starting:
    "animate-breathe bg-warning shadow-[0_0_0_5px_color-mix(in_srgb,var(--warning)_16%,transparent)]",
  stopped:
    "bg-stopped shadow-[0_0_0_5px_color-mix(in_srgb,var(--stopped)_16%,transparent)]",
  problem:
    "bg-destructive shadow-[0_0_0_5px_color-mix(in_srgb,var(--destructive)_15%,transparent)]",
  none: "hidden",
};

export const LIGHTS: Light[] = ["running", "starting", "stopped", "problem"];

export function StatusLight({
  light,
  className,
}: Readonly<{ light: Light; className?: string }>) {
  return (
    <i
      role="img"
      aria-label={LABEL[light] || undefined}
      className={cn(
        "inline-block size-2 flex-none rounded-full",
        LOOK[light],
        className,
      )}
    />
  );
}
