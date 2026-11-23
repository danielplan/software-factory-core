// PROTOTYPE, "Meet the kobolds": the "Your kobolds" panel, with all of them,
// Tinker too. A kobold's face (Face, below), a name tag or the words naming it
// open it; the one clicked is lit.

import type { ReactNode } from "react";

import type { Doing } from "@/components/layout/page-kobold";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { closeTeam, memberOf, openTeam, useTeamDoing, usePanel } from "./meet";
import { Workshop } from "./workshop";

// A kobold's face that opens the panel.
export function Face({
  id,
  children,
  className,
}: Readonly<{ id: string; children: ReactNode; className?: string }>) {
  return (
    <button
      type="button"
      aria-label={`Meet ${memberOf(id).name} and the team`}
      title="Meet your kobolds"
      className={cn(
        "cursor-pointer rounded-lg p-0.5 transition-transform duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-blue/50 focus-visible:outline-none",
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

export function NameLink({
  id,
  children,
}: Readonly<{ id: string; children: ReactNode }>) {
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

export function TeamPanel({ doing }: Readonly<{ doing: Doing }>) {
  const { open, focus } = usePanel();
  const now = useTeamDoing(doing);
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
            The team that works for you. Click a kobold to meet it.
          </DialogDescription>
        </div>
        <Workshop now={now} focus={focus} />
      </DialogContent>
    </Dialog>
  );
}
