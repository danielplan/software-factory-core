// Personas, the first level of Understand: one card with a row per person
// who uses the product, each leading to their page: who they are, how many
// of their problems are still open and how many things people like them
// said. What came in to look at is on Signals now.

import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PersonaCard, RecordsView, UnderstandOverview } from "@/api";
import { understandHash } from "@/lib/routes";

import { Initial } from "./bits";
import { useAllRecords } from "./use-records";
import { saidOf } from "./view";

export function Overview({
  overview,
  tint,
}: Readonly<{
  overview: UnderstandOverview;
  tint: (persona: string) => string;
}>) {
  const { t } = useTranslation("understand");
  const { data: all } = useAllRecords();
  if (overview.personas.length === 0)
    return (
      <p className="rounded-[18px] bg-card px-5 py-4 text-body text-muted-foreground shadow-soft">
        {t("overview.empty")}
      </p>
    );
  return (
    <ul
      aria-label={t("overview.people")}
      className="grid animate-enter rounded-[18px] bg-card p-2 shadow-soft"
    >
      {overview.personas.map((card) => (
        <li
          key={card.persona.id}
          className="border-t border-border-soft first:border-t-0"
        >
          <PersonRow card={card} tint={tint(card.persona.id)} all={all} />
        </li>
      ))}
    </ul>
  );
}

function PersonRow({
  card,
  tint,
  all,
}: Readonly<{ card: PersonaCard; tint: string; all: RecordsView | null }>) {
  const { t } = useTranslation("understand");
  const { persona, summary } = card;
  const said = all ? saidOf(all.records, persona.id).length : null;
  return (
    <a
      href={understandHash(persona.id)}
      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Initial name={persona.name} tint={tint} />
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-item">{persona.name}</span>
        <span className="truncate text-note text-muted-foreground">
          {persona.role}
        </span>
      </span>
      {summary.openStories > 0 && (
        <span className="rounded-full bg-open px-2 py-0.5 text-tag text-open-foreground">
          {t("overview.open", { count: summary.openStories })}
        </span>
      )}
      {said !== null && (
        <span className="w-24 text-right text-note text-muted-foreground max-sm:hidden">
          {t("overview.signals", { count: said })}
        </span>
      )}
      <ChevronRight
        aria-hidden
        className="size-4 flex-none text-muted-foreground"
      />
    </a>
  );
}
