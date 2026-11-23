// PROTOTYPE, "Meet the kobolds", variant A: one panel with all the kobolds,
// Tinker too: face, job, where it works, what it does right now and what to
// do meanwhile. A kobold's face opens it (Face, below); the one clicked is lit.

import { Users } from "lucide-react";
import type { ReactNode } from "react";

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
  memberOf,
  openTeam,
  useTeamDoing,
  usePanel,
  HAS_PANEL,
  VARIANT,
} from "./meet";
import { Workshop } from "./workshop";

// A kobold's face that opens the panel (variant A); the face alone in B.
export function Face({
  id,
  children,
  className,
}: Readonly<{ id: string; children: ReactNode; className?: string }>) {
  if (!HAS_PANEL) return <>{children}</>;
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
  if (!HAS_PANEL) return <>{children}</>;
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
  if (!HAS_PANEL) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeTeam();
      }}
    >
      <DialogContent className="flex max-h-[92dvh] w-[1080px] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden rounded-[14px] bg-card p-0 sm:max-w-[1080px]">
        <div className="grid gap-1 px-6 pt-6 pb-4 pr-12">
          <DialogTitle className="text-[17px] tracking-[-0.01em]">
            Your kobolds
          </DialogTitle>
          <DialogDescription>
            A little workshop: each kobold at its station, along the line your
            work travels. Click one to meet it.
          </DialogDescription>
        </div>
        <Workshop now={now} focus={focus} />
      </DialogContent>
    </Dialog>
  );
}
