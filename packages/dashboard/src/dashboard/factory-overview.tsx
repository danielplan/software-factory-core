import { Hammer, Lightbulb, SquareKanban } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRACKER_NAMES } from "@/setup/draft";

import type { FactoryState } from "./dashboard";

// The factory itself, at a glance: its ideas, where its work is tracked,
// and its builder (to come), each a tile that leads to it.
export function FactoryOverview({ state }: Readonly<{ state: FactoryState }>) {
  return (
    <Card aria-label="The factory" className="gap-3 py-5 shadow-soft">
      <CardHeader className="px-5">
        <CardTitle className="text-[17px]">The factory</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2.5 px-5 sm:grid-cols-3">
        {componentsOf(state).map(({ icon: Icon, ...one }) => {
          const inner = (
            <>
              <span className="flex items-center gap-2 text-sm font-medium">
                <span
                  className="flex size-7 items-center justify-center rounded-lg [&_svg]:size-4"
                  style={{
                    color: one.colour,
                    background: `color-mix(in oklab, ${one.colour} 14%, transparent)`,
                  }}
                >
                  <Icon aria-hidden />
                </span>
                {one.name}
              </span>
              <span className="text-xs text-muted-foreground">{one.text}</span>
            </>
          );
          const look =
            "grid gap-1.5 rounded-xl border border-border-soft bg-surface px-3 py-2.5";
          return one.href ? (
            <a
              key={one.name}
              href={one.href}
              className={`${look} hover:border-foreground/30`}
            >
              {inner}
            </a>
          ) : (
            <div key={one.name} className={look}>
              {inner}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// The factory's own components, each with its icon and colour.
function componentsOf(state: FactoryState) {
  const ready = state.ideas.filter((idea) => idea.status === "ready").length;
  return [
    {
      name: "Ideas",
      text: `${count(state.ideas.length, "idea")}, ${String(ready)} ready to build`,
      icon: Lightbulb,
      colour: "#e2a13c",
      href: "#ideas",
    },
    {
      name: "Where work is tracked",
      text: TRACKER_NAMES[state.company.tracker],
      icon: SquareKanban,
      colour: "#8b5cf6",
      href: "#connect",
    },
    {
      name: "Builder",
      text: "Builds the ideas you agree to: comes next",
      icon: Hammer,
      colour: "#64748b",
    },
  ];
}

// "1 idea", "3 ideas".
function count(n: number, noun: string): string {
  return `${String(n)} ${noun}${n === 1 ? "" : "s"}`;
}
