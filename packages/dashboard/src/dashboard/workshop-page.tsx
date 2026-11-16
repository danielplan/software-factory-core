import { cn } from "@/lib/utils";

import { AddOnsTab } from "./add-ons-tab";
import type { FactoryState } from "./dashboard";
import { SystemTab } from "./system-tab";

const PARTS = [
  { name: "System", href: "#workshop" },
  { name: "Add-ons", href: "#workshop/add-ons" },
];

// The factory itself, in two parts: the system (the programs it runs, with
// their lights) and the add-ons and kits it works with (#workshop/add-ons).
export function WorkshopPage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  const addOns = open === "add-ons";
  const shown = addOns ? "#workshop/add-ons" : "#workshop";
  return (
    <div className="grid content-start gap-4">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 px-1 pt-1">
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          Workshop
        </h1>
        <nav
          aria-label="Workshop"
          className="flex gap-1 rounded-full bg-card p-1 shadow-soft"
        >
          {PARTS.map((part) => {
            const here = part.href === shown;
            return (
              <a
                key={part.href}
                href={part.href}
                aria-current={here ? "page" : undefined}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground",
                  here && "bg-surface-2 font-medium text-foreground",
                )}
              >
                {part.name}
              </a>
            );
          })}
        </nav>
      </header>
      {addOns ? <AddOnsTab state={state} /> : <SystemTab state={state} />}
    </div>
  );
}
