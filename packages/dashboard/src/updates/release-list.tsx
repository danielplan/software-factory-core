// What each Kobble release changes for the team, from the changelog's own
// markdown: a collapsible section per release (the newest open), its "To
// upgrade" paragraph in a box, each entry with a coloured tag (New first,
// then Changed, then Fixed), long entries cut after a sentence or two.

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Locale } from "@/i18n/locale";
import { useLanguage } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

import {
  CHANGELOG,
  CURRENT,
  type Entry,
  FOUND,
  type Kind,
  parseChangelog,
  type Release,
  splitEntry,
} from "./changelog-data";

const WORDS = {
  en: {
    title: "What's new in Kobble",
    isNew: "New",
    yours: "You're on this one",
    upgrade: "To upgrade",
    more: "More",
    less: "Less",
    nothing: "Nothing to do.",
    kinds: { New: "New", Changed: "Changed", Fixed: "Fixed" },
  },
  it: {
    title: "Novità di Kobble",
    isNew: "Nuovo",
    yours: "Usi questa",
    upgrade: "Per aggiornare",
    more: "Altro",
    less: "Meno",
    nothing: "Niente da fare.",
    kinds: { New: "Nuovo", Changed: "Cambiato", Fixed: "Corretto" },
  },
  de: {
    title: "Neu in Kobble",
    isNew: "Neu",
    yours: "Du nutzt diese",
    upgrade: "Zum Aktualisieren",
    more: "Mehr",
    less: "Weniger",
    nothing: "Nichts zu tun.",
    kinds: { New: "Neu", Changed: "Geändert", Fixed: "Behoben" },
  },
} satisfies Record<Locale, object>;

const TAG: Record<Kind, string> = {
  New: "bg-success/15 text-success",
  Changed: "bg-blue/10 text-blue",
  Fixed: "bg-warning/20 text-[#9a6412]",
};

export function ReleaseList({
  newest = null,
  titled = true,
}: Readonly<{ newest?: string | null; titled?: boolean }>) {
  const { locale } = useLanguage();
  const w = WORDS[locale];
  const releases = [
    ...(newest ? parseChangelog(FOUND, newest) : []),
    ...parseChangelog(CHANGELOG),
  ];
  return (
    <div className="grid gap-3">
      {titled && <h3 className="text-[13px] font-semibold">{w.title}</h3>}
      {releases.map((release, at) => (
        <ReleaseSection
          key={release.version}
          release={release}
          first={at === 0}
          isNew={release.version === newest}
        />
      ))}
    </div>
  );
}

function ReleaseSection({
  release,
  first,
  isNew,
}: Readonly<{ release: Release; first: boolean; isNew: boolean }>) {
  const { locale } = useLanguage();
  const w = WORDS[locale];
  const [open, setOpen] = useState(first);
  const date = release.date
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
        new Date(release.date),
      )
    : "";
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-[10px] border border-line-soft"
    >
      <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3 text-left text-[13px] font-medium">
        <ChevronRight
          aria-hidden
          className={cn(
            "size-3.5 flex-none text-muted-foreground transition-transform",
            open && "rotate-90",
          )}
        />
        Kobble {release.version}
        {isNew && (
          <span className="rounded-md bg-blue/10 px-1.5 py-0.5 text-[11px] font-medium text-blue">
            {w.isNew}
          </span>
        )}
        {release.version === CURRENT && (
          <span className="text-xs font-normal text-muted-foreground">
            {w.yours}
          </span>
        )}
        <span className="ml-auto text-xs font-normal text-muted-foreground">
          {date}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-3 px-4 pb-4">
        {release.upgrade && (
          <div className="rounded-[10px] bg-blue/10 px-3 py-2.5 text-[13px] [overflow-wrap:anywhere]">
            <span className="font-semibold">{w.upgrade}: </span>
            <Markdown inline text={release.upgrade} />
          </div>
        )}
        <ul className="grid gap-3">
          {release.entries.map((entry) => (
            <EntryRow key={entry.text} entry={entry} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function EntryRow({ entry }: Readonly<{ entry: Entry }>) {
  const { locale } = useLanguage();
  const w = WORDS[locale];
  const [more, setMore] = useState(false);
  const { head, rest } = splitEntry(entry.text);
  return (
    <li className="flex items-start gap-3 text-[13px]">
      <span
        className={cn(
          "mt-0.5 min-w-[68px] flex-none rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium",
          TAG[entry.kind],
        )}
      >
        {w.kinds[entry.kind]}
      </span>
      <div className="grid min-w-0 flex-1 gap-1 [overflow-wrap:anywhere]">
        <Markdown inline text={more ? entry.text : head} />
        {more && entry.nothingToDo && (
          <span className="text-xs text-muted-foreground">{w.nothing}</span>
        )}
        {!more && !rest && entry.nothingToDo && (
          <span className="text-xs text-muted-foreground">{w.nothing}</span>
        )}
        {rest && (
          <button
            type="button"
            onClick={() => {
              setMore(!more);
            }}
            className="justify-self-start text-xs font-medium text-blue hover:underline"
          >
            {more ? w.less : w.more}
          </button>
        )}
      </div>
    </li>
  );
}
