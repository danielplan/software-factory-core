import {
  LayoutDashboard,
  Lightbulb,
  Settings,
  SquareKanban,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const TABS = ["board", "ideas", "system", "settings"] as const;
export type Tab = (typeof TABS)[number];

const ITEMS: Record<Tab, { name: string; icon: ReactNode }> = {
  board: { name: "Board", icon: <SquareKanban aria-hidden /> },
  ideas: { name: "Ideas", icon: <Lightbulb aria-hidden /> },
  system: { name: "System", icon: <LayoutDashboard aria-hidden /> },
  settings: { name: "Settings", icon: <Settings aria-hidden /> },
};

// The way around the dashboard: a thin rail of icons, each with its name
// underneath, against the left edge (along the top on a phone), the whole
// factory's light last.
export function NavRail({
  current,
  status,
}: Readonly<{ current: Tab; status?: ReactNode }>) {
  return (
    <nav
      aria-label="Tabs"
      className="pointer-events-auto fixed inset-x-0 top-0 z-30 flex items-center gap-1 border-b border-border-soft bg-card px-2 py-1.5 sm:inset-y-0 sm:right-auto sm:w-[72px] sm:flex-col sm:border-r sm:border-b-0 sm:px-0 sm:py-3"
    >
      {TABS.map((tab) => (
        <a
          key={tab}
          href={`#${tab}`}
          aria-current={current === tab ? "page" : undefined}
          className={cn(
            "flex min-h-11 w-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] text-muted-foreground hover:bg-surface-2 hover:text-foreground [&_svg]:size-[18px]",
            current === tab && "glow-card text-foreground shadow-soft",
          )}
        >
          {ITEMS[tab].icon}
          <span className="max-sm:sr-only">{ITEMS[tab].name}</span>
        </a>
      ))}
      {status && (
        <span className="flex size-11 items-center justify-center sm:mt-auto">
          {status}
        </span>
      )}
    </nav>
  );
}
