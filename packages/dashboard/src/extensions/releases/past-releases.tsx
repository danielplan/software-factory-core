// The past releases, newest first: each with its number, its date and the
// line saying why; it folds open to show its notes.

import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { ReleasesView } from "@/api/client";
import { Markdown } from "@/components/markdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { dayIn } from "@/i18n/format";
import { useLocale } from "@/i18n/use-t";
import { cn } from "@/lib/utils";
import { CARD } from "@/components/page-bits";

type Past = Extract<ReleasesView, { connected: true }>["past"][number];

export function PastReleases({ past }: Readonly<{ past: Past[] }>) {
  const t = useTranslation().t;
  return (
    <section className="mt-6 grid gap-3" aria-labelledby="past-releases">
      <h2 id="past-releases" className="text-[15px] font-semibold">
        {t("releases.past")}
      </h2>
      {past.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {t("releases.noPast")}
        </p>
      ) : (
        <div className={cn(CARD, "divide-y divide-border")}>
          {past.map((release) => (
            <PastRelease key={release.number} release={release} />
          ))}
        </div>
      )}
    </section>
  );
}

function PastRelease({ release }: Readonly<{ release: Past }>) {
  const t = useTranslation().t;
  const locale = useLocale();
  return (
    <Collapsible className="group">
      <CollapsibleTrigger
        aria-label={t("releases.showNotes", { number: release.number })}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left text-[13px] hover:bg-accent/50"
      >
        <ChevronRight
          aria-hidden
          className="size-4 flex-none transition-transform group-data-[state=open]:rotate-90"
        />
        <span className="font-mono text-[14px] font-semibold">
          {release.number}
        </span>
        {release.date && (
          <span className="text-muted-foreground">
            {dayIn(locale, release.date)}
          </span>
        )}
        {release.why && (
          <span className="min-w-0 break-words text-muted-foreground">
            {release.why}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pl-11 text-[13px]">
        {release.notes.trim() ? (
          <Markdown text={release.notes} />
        ) : (
          <p className="text-muted-foreground">{t("releases.noNotes")}</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
