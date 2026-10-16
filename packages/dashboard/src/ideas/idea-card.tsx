import { Loader2 } from "lucide-react";

import type { IdeaView } from "@/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { stageOf } from "./stages";

// An idea as a card: its title, and whether the factory is working on it
// now or when it last changed. It opens the idea (#ideas/<id>).
export function IdeaCard({
  idea,
  status = true,
}: Readonly<{
  idea: IdeaView;
  // Whether it says how far it is (not on the board, whose columns say so).
  status?: boolean;
}>) {
  const stage = stageOf(idea.status);
  return (
    <a
      href={`#ideas/${idea.id}`}
      className={cn(
        "grid gap-1.5 rounded-xl border-l-[3px] bg-card p-3 shadow-soft hover:ring-1 hover:ring-foreground/20",
        idea.working && "ring-2 ring-[var(--glow-c)]",
      )}
      style={{ borderLeftColor: stage.colour }}
    >
      <span className="flex items-start gap-2">
        <span className="flex-1 text-sm font-medium">{idea.title}</span>
        {status && (
          <Badge
            className="border-transparent"
            style={{
              color: stage.colour,
              background: `color-mix(in oklab, ${stage.colour} 14%, transparent)`,
            }}
          >
            {stage.title === "Draft" ? "Draft" : "Ready"}
          </Badge>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {idea.working ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden /> Working on
            it…
          </>
        ) : (
          when(idea.updated)
        )}
      </span>
    </a>
  );
}

// "Today, 10:24", or the date.
function when(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return date.toDateString() === new Date().toDateString()
    ? `Today, ${time}`
    : date.toLocaleDateString();
}
