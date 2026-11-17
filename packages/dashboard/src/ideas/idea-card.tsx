import { Loader2 } from "lucide-react";

import type { IdeaView } from "@/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { i18next, t } from "../i18n/i18n.ts";
import { stageOf } from "./stages";

// An idea as a card: its title, and whether the factory is working on it
// now or when it last changed. It opens the idea (#explore/<id>).
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
      href={`#explore/${idea.id}`}
      className={cn(
        "grid gap-1.5 rounded-xl bg-card p-3 shadow-soft transition-shadow hover:shadow-lift",
        idea.working && "ring-2 ring-tint-line",
      )}
    >
      <span className="flex items-start gap-2">
        <span className="flex-1 text-item">{idea.title}</span>
        {status && (
          <Badge
            className="border-transparent"
            style={{
              color: stage.colour,
              background: `color-mix(in oklab, ${stage.colour} 14%, transparent)`,
            }}
          >
            {stage.id === "draft"
              ? t("build:idea.draft")
              : t("build:idea.ready")}
          </Badge>
        )}
      </span>
      <span className="flex items-center gap-1.5 text-tag text-muted-foreground">
        {idea.working ? (
          <>
            <Loader2 className="size-3 animate-spin" aria-hidden />{" "}
            {t("build:idea.working")}
          </>
        ) : (
          when(idea.updated)
        )}
      </span>
    </a>
  );
}

// "Today, 10:24", or the date, written the way the dashboard's language
// writes them.
function when(iso: string): string {
  const date = new Date(iso);
  const language = i18next.language;
  const time = date.toLocaleTimeString(language, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return date.toDateString() === new Date().toDateString()
    ? t("build:idea.today", { time })
    : date.toLocaleDateString(language);
}
