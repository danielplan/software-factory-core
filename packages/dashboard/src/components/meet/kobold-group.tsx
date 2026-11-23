// The sidebar's "Your kobolds": each kobold's face, name and a live line of
// what it does; Tinker under Doodle, only while it works.

import { useTranslation } from "react-i18next";

import { KoboldHead } from "@/components/kobold-face";
import { GroupLabel } from "@/components/layout/team-pages";
import { openTeam } from "@/lib/meet";
import { type Now, shownInGroup } from "@/lib/meet-view";
import { cn } from "@/lib/utils";

export function KoboldGroup({
  now,
  onGo,
}: Readonly<{ now: Now; onGo?: () => void }>) {
  const t = useTranslation().t;
  return (
    <nav aria-label={t("meet.title")} className="grid gap-px pt-4">
      <GroupLabel>{t("meet.title")}</GroupLabel>
      {shownInGroup(now).map((member) => {
        const line = now[member.id];
        const helper = member.id === "maker";
        return (
          <button
            key={member.id}
            type="button"
            title={t("meet.meet")}
            onClick={() => {
              onGo?.();
              openTeam(member.id);
            }}
            className={cn(
              "flex min-w-0 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-0.5 text-left hover:bg-sidebar-hover",
              helper && "ml-4 pl-2",
            )}
          >
            <span className="relative flex-none">
              <KoboldHead
                size={helper ? 22 : 26}
                hat={member.hat}
                color={member.color}
                className={cn(line && "motion-safe:animate-breathe")}
              />
              {line && (
                <span className="absolute -top-0.5 -right-0.5 size-[7px] rounded-full bg-success ring-2 ring-sidebar" />
              )}
            </span>
            <span className="grid min-w-0 flex-1">
              <span className="truncate text-[13px] text-sidebar-strong">
                {member.name}
              </span>
              <span className="truncate text-[11px] text-sidebar-muted">
                {line ?? t("meet.resting")}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
