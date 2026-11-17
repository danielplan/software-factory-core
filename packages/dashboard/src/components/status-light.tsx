import type { Light } from "@/api";
import { t } from "@/i18n/i18n";
import { cn } from "@/lib/utils";

// Each light's word, in the person's language when it is read (so a new
// language shows at once).
export const LABEL: Record<Light, string> = {
  get running() {
    return t("common:light.running");
  },
  get stopped() {
    return t("common:light.stopped");
  },
  get starting() {
    return t("common:light.starting");
  },
  get problem() {
    return t("common:light.problem");
  },
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
