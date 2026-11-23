// PROTOTYPE, "Meet the kobolds": the kobolds are always there
// where they work. A name tag on the thing a kobold works on, every time:
// its face, "Name · role", what it does now in plain words and what that
// means for you. A click opens the "Your kobolds" panel with it lit.
// The sidebar's group of kobolds is here too (KoboldGroup).

import { KoboldHead } from "@/components/kobold-face";
import type { Doing } from "@/components/layout/page-kobold";
import { GroupLabel } from "@/components/layout/team-pages";
import { cn } from "@/lib/utils";

import { memberOf, openTeam, useTeamDoing } from "./meet";

export function NameTag({
  id,
  now,
  means,
  detail,
  className,
}: Readonly<{
  id: string;
  now: string;
  means: string;
  detail?: string | null;
  className?: string;
}>) {
  const member = memberOf(id);
  return (
    <button
      type="button"
      title="Meet your kobolds"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        openTeam(id);
      }}
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-left transition-shadow hover:shadow-card",
        className,
      )}
      style={{
        borderColor: `${member.color}40`,
        background: `${member.color}10`,
      }}
    >
      <KoboldHead
        size={34}
        hat={member.hat}
        color={member.color}
        className="mt-0.5 motion-safe:animate-bob"
      />
      <span className="grid min-w-0 flex-1 gap-0.5 text-xs leading-snug">
        <span className="font-semibold break-words text-foreground">
          {member.name} · {member.role}
        </span>
        <span
          className="font-medium break-words [overflow-wrap:anywhere]"
          style={{ color: member.color }}
        >
          {now}
        </span>
        {detail && (
          <span className="break-words text-foreground-2">{detail}</span>
        )}
        <span className="break-words text-muted-foreground">{means}</span>
      </span>
    </button>
  );
}

// The sidebar's "Your kobolds": each kobold's face, name and a live line of
// what it does; Tinker under Doodle while it works.
const ORDER = ["support", "explorer", "maker", "builder", "tester", "sorter"];

export function KoboldGroup({ doing }: Readonly<{ doing: Doing }>) {
  const now = useTeamDoing(doing);
  return (
    <nav aria-label="Your kobolds" className="grid gap-px pt-3">
      <GroupLabel>Your kobolds</GroupLabel>
      {ORDER.filter((id) => id !== "maker" || now.maker).map((id) => {
        const member = memberOf(id);
        const line = now[id];
        const helper = id === "maker";
        return (
          <button
            key={id}
            type="button"
            title="Meet your kobolds"
            onClick={() => {
              openTeam(id);
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
              <span
                className={cn(
                  "truncate text-[11px]",
                  line ? "text-sidebar-foreground" : "text-sidebar-muted",
                )}
              >
                {line ?? "Resting"}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
