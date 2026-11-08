import { ArrowUpRight, Loader2 } from "lucide-react";

import type { CardView } from "@/api";
import { cn } from "@/lib/utils";

// A card from the connected board: its number and title, opening it where
// it is tracked; the one the builder or the coach works on says so.
export function BoardCard({
  card,
  working,
}: Readonly<{ card: CardView; working: string | null }>) {
  return (
    <a
      href={card.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "grid gap-1.5 rounded-xl bg-card p-3 shadow-soft transition-shadow hover:ring-1 hover:ring-foreground/20",
        working && "ring-2 ring-[var(--tint)]",
      )}
    >
      <span className="flex items-start gap-2">
        <span className="flex-1 text-sm font-medium">{card.title}</span>
        <ArrowUpRight
          className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {working ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden /> {working}
          </>
        ) : (
          `#${String(card.number)}`
        )}
      </span>
    </a>
  );
}
