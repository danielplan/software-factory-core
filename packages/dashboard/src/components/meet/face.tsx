// A kobold's face that opens the "Your kobolds" panel with it lit. A face
// stands free: no border, ring or tile; hovering lifts it a little. Where
// there is no panel (the setup), it is only a face.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { memberOf, type TeamId } from "@/lib/kobolds";
import { openTeam, usePanel } from "@/lib/meet";
import { cn } from "@/lib/utils";

export function Face({
  id,
  children,
  className,
}: Readonly<{ id: TeamId; children: ReactNode; className?: string }>) {
  const t = useTranslation().t;
  const { ready } = usePanel();
  if (ready === 0) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      aria-label={t("meet.meetName", { name: memberOf(id).name })}
      title={t("meet.meet")}
      className={cn(
        "cursor-pointer rounded-lg p-0.5 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openTeam(id);
      }}
    >
      {children}
    </button>
  );
}
