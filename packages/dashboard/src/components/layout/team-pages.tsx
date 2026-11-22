// The pages of the team's own extensions in the sidebar, in a group after
// Kobble's own.

import type { ReactNode } from "react";

import type { ShownView } from "@/api/client";
import { iconOf } from "@/components/screen-view";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/use-t";

import { Tile } from "./sidebar-links";

export function GroupLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="px-2.5 pb-1 text-[11px] font-medium text-sidebar-muted">
      {children}
    </span>
  );
}

// The pages of the team's own extensions, in a group after Kobble's.
export function TeamPages({
  pages,
  current,
  onGo,
}: Readonly<{
  pages: ShownView[];
  current: string | null;
  onGo?: () => void;
}>) {
  const t = useT().shell;
  if (pages.length === 0) return null;
  return (
    <nav aria-label={t.groups.team} className="grid gap-px pt-4">
      <GroupLabel>{t.groups.team}</GroupLabel>
      {pages.map((page) => (
        <a
          key={page.id}
          href={`#team/${encodeURIComponent(page.id)}`}
          onClick={onGo}
          aria-current={current === page.id ? "page" : undefined}
          className={cn(
            "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-normal text-sidebar-foreground hover:bg-sidebar-hover [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]",
            current === page.id &&
              "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
          )}
        >
          <Tile color="#8b5cf6">{iconOf(page.icon)}</Tile>
          <span className="truncate">{page.name}</span>
        </a>
      ))}
    </nav>
  );
}
