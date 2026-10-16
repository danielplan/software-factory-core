import { LayoutDashboard, Package, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { LogoTile } from "./logo";

export const TABS = ["system", "products", "settings"] as const;
export type Tab = (typeof TABS)[number];

const ITEMS: Record<Tab, { name: string; icon: ReactNode }> = {
  system: { name: "System", icon: <LayoutDashboard aria-hidden /> },
  products: { name: "Products", icon: <Package aria-hidden /> },
  settings: { name: "Settings", icon: <Settings aria-hidden /> },
};

// The way around the dashboard: a thin rail of icons, each with its name
// underneath, down the left edge (along the top on a phone), the factory's
// mark first and the whole factory's light last. It floats, so a page can
// use the whole window behind it.
export function NavRail({
  current,
  status,
}: Readonly<{ current: Tab; status?: ReactNode }>) {
  return (
    <nav
      aria-label="Tabs"
      className="pointer-events-auto fixed top-3 left-3 z-30 flex items-center gap-1 rounded-[20px] bg-card/90 p-1.5 shadow-soft backdrop-blur sm:bottom-3 sm:w-16 sm:flex-col"
    >
      <span className="p-1 sm:mb-2">
        <LogoTile small />
      </span>
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
