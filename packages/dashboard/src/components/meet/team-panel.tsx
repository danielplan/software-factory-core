// PROTOTYPE, "Meet the kobolds", variant A: one panel with all the kobolds,
// Tinker too: face, job, where it works, what it does right now and what to
// do meanwhile. A kobold's face opens it (Face, below); the one clicked is lit.

import { Users } from "lucide-react";
import { Link } from "react-router";
import type { ReactNode } from "react";

import { KoboldHead } from "@/components/kobold-face";
import type { Doing } from "@/components/layout/page-kobold";
import { Tile } from "@/components/layout/sidebar-links";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import {
  closeTeam,
  type Member,
  memberOf,
  openTeam,
  TEAM,
  useTeamDoing,
  usePanel,
  VARIANT,
} from "./meet";

// A kobold's face that opens the panel (variant A); the face alone in B.
export function Face({
  id,
  children,
  className,
}: Readonly<{ id: string; children: ReactNode; className?: string }>) {
  if (VARIANT !== "A") return <>{children}</>;
  return (
    <button
      type="button"
      aria-label={`Meet ${memberOf(id).name} and the team`}
      title="Meet your kobolds"
      className={cn(
        "cursor-pointer rounded-lg p-0.5 ring-1 ring-foreground/15 transition-shadow duration-150 hover:ring-2 hover:ring-blue/60 focus-visible:ring-2 focus-visible:ring-blue/60 focus-visible:outline-none",
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

// Words that name a kobold, as a link that opens the panel with it lit
// (variant A); plain words in B.
export function NameLink({
  id,
  children,
}: Readonly<{ id: string; children: ReactNode }>) {
  if (VARIANT !== "A") return <>{children}</>;
  return (
    <button
      type="button"
      title={`Meet ${memberOf(id).name} and the team`}
      className="cursor-pointer underline decoration-current/40 underline-offset-2 hover:decoration-current"
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

// "Your kobolds", a row in the sidebar's bottom group, beside Send feedback.
export function KoboldsRow() {
  if (VARIANT !== "A") return null;
  return (
    <button
      type="button"
      onClick={() => {
        openTeam();
      }}
      className="group flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]"
    >
      <Tile color="#667085">
        <Users aria-hidden />
      </Tile>
      Your kobolds
    </button>
  );
}

export function TeamPanel({ doing }: Readonly<{ doing: Doing }>) {
  const { open, focus } = usePanel();
  const now = useTeamDoing(doing);
  if (VARIANT !== "A") return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeTeam();
      }}
    >
      <DialogContent className="flex max-h-[88dvh] w-[560px] bg-card max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-[14px] p-0 sm:max-w-[560px]">
        <div className="grid gap-1 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-[17px] tracking-[-0.01em]">
            Your kobolds
          </DialogTitle>
          <DialogDescription>
            The team that works for you. Each one stays on its own page; here is
            what they are doing now.
          </DialogDescription>
        </div>
        <ul className="min-h-0 flex-1 divide-y divide-border-soft overflow-y-auto border-t border-border-soft">
          {TEAM.map((member) => (
            <Row
              key={member.id}
              member={member}
              now={now[member.id] ?? null}
              lit={focus === member.id}
            />
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  member,
  now,
  lit,
}: Readonly<{ member: Member; now: string | null; lit: boolean }>) {
  return (
    <li
      className={cn("flex min-w-0 gap-3.5 px-6 py-4", lit && "bg-picked")}
      aria-current={lit ? "true" : undefined}
    >
      <KoboldHead
        size={40}
        hat={member.hat}
        color={member.color}
        className={cn(now && "motion-safe:animate-breathe")}
      />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[14px] font-semibold">{member.name}</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              now
                ? "bg-success/10 text-solved-foreground"
                : "bg-surface-2 text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                now ? "bg-success" : "bg-faint",
              )}
            />
            {now ? "At work" : "Resting"}
          </span>
        </div>
        <p className="text-[13px] leading-snug break-words">{member.job}</p>
        <p className="text-xs leading-snug break-words text-muted-foreground">
          Works at:{" "}
          {member.page ? (
            <Link
              to={`/${member.page}`}
              onClick={closeTeam}
              className="font-medium text-foreground underline underline-offset-2"
            >
              {member.where}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{member.where}</span>
          )}
        </p>
        {now && (
          <div className="grid gap-0.5 rounded-md bg-blue/8 px-2.5 py-1.5 text-xs leading-snug text-blue">
            <span className="font-medium break-words [overflow-wrap:anywhere]">
              Now: {now}
            </span>
            <span className="text-muted-foreground">
              Meanwhile: {member.meanwhile}
            </span>
          </div>
        )}
      </div>
    </li>
  );
}
