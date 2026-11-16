import { PageHead } from "@/components/page-head";
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
      <PageHead
        title="Workshop"
        about="The factory itself: the programs it runs, and the add-ons and kits it works with."
      >
        <nav
          aria-label="Workshop"
          className="flex gap-1 rounded-[14px] bg-surface-2 p-1"
        >
          {PARTS.map((part) => {
            const here = part.href === shown;
            return (
              <a
                key={part.href}
                href={part.href}
                aria-current={here ? "page" : undefined}
                className={cn(
                  "rounded-[10px] px-3.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground",
                  here && "bg-card text-foreground shadow-current",
                )}
              >
                {part.name}
              </a>
            );
          })}
        </nav>
      </PageHead>
      {addOns ? <AddOnsTab state={state} /> : <SystemTab state={state} />}
    </div>
  );
}
