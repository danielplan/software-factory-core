// The steps of setting up, as the sidebar's rows (the same rows as the
// factory's pages): each with its number in its tile, a check once it is
// behind, lit while it is shown; a step not reached yet cannot be opened.

import type { TFunction } from "i18next";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SidebarLink } from "@/components/layout/sidebar-links";
import { GroupLabel } from "@/components/layout/team-pages";

import type { Step } from "./steps";

export function SetupSteps({
  steps,
  at,
  reach,
  onGo,
}: Readonly<{
  steps: Step[];
  at: number;
  // The last step that can be opened (none before Sprocket read).
  reach: number;
  onGo?: () => void;
}>) {
  const t = useTranslation().t;
  return (
    <nav aria-label={t("setup.stepsLabel")} className="grid gap-px">
      <GroupLabel>{t("setup.stepsLabel")}</GroupLabel>
      {steps.map((step, n) => (
        <SidebarLink
          key={step.id}
          href={`#step-${String(n)}`}
          label={nameOf(t, step)}
          color={n < at ? "#12a594" : "var(--primary)"}
          icon={
            n < at ? (
              <Check aria-hidden />
            ) : (
              <span className="text-[11px] font-semibold">{n}</span>
            )
          }
          current={n === at}
          disabled={n > reach && n !== at}
          onGo={onGo}
        />
      ))}
    </nav>
  );
}

// A step's name in the language shown.
export function nameOf(t: TFunction, step: Step): string {
  const words = t("setup.steps", { returnObjects: true }) as Record<
    string,
    { name: string } | undefined
  >;
  return words[step.id]?.name ?? step.name;
}
