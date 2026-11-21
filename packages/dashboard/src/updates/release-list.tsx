// What each Kobble release changes for the team, from the changelog's own
// markdown: a collapsible section per release (the newest open), its "To
// upgrade" paragraph in a box, each entry with a coloured tag (New first,
// then Changed, then Fixed), long entries cut after a sentence or two.

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

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
  KINDS,
  type Kind,
  ON_ITS_WAY,
  type Release,
} from "./changelog-data";

const WORDS = {
  en: {
    title: "What's new in Kobble",
    isNew: "New",
    yours: "You're on this one",
    more: "More",
    less: "Less",
    kinds: { New: "New", Changed: "Changed", Fixed: "Fixed" },
  },
  it: {
    title: "Novità di Kobble",
    isNew: "Nuovo",
    yours: "Usi questa",
    more: "Altro",
    less: "Meno",
    kinds: { New: "Nuovo", Changed: "Cambiato", Fixed: "Corretto" },
  },
  de: {
    title: "Neu in Kobble",
    isNew: "Neu",
    yours: "Du nutzt diese",
    more: "Mehr",
    less: "Weniger",
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
  const releases: Release[] = [
    ...(newest ? [{ version: newest, ...ON_ITS_WAY }] : []),
    ...CHANGELOG,
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
  // The changes of the release open on first view fade in one after another,
  // once.
  const [fresh, setFresh] = useState(first);
  useEffect(() => {
    if (!first) return;
    const id = setTimeout(() => {
      setFresh(false);
    }, 900);
    return () => {
      clearTimeout(id);
    };
  }, [first]);
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
            "size-3.5 flex-none text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
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
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse-close data-[state=open]:animate-collapse-open">
        <ul className="grid gap-3 px-4 pb-4">
          {byKind(release.entries).map((entry, at) => (
            <EntryRow
              key={entry.title.en}
              entry={entry}
              delay={fresh ? at * 60 : null}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

// New first, then Changed, then Fixed.
function byKind(entries: Entry[]): Entry[] {
  return KINDS.flatMap((kind) => entries.filter((e) => e.kind === kind));
}

function EntryRow({
  entry,
  delay,
}: Readonly<{ entry: Entry; delay: number | null }>) {
  const { locale } = useLanguage();
  const w = WORDS[locale];
  const [more, setMore] = useState(false);
  return (
    <li
      className={cn(
        "flex items-start gap-3 text-[13px]",
        delay !== null && "animate-fade-in",
      )}
      style={delay === null ? undefined : { animationDelay: `${delay}ms` }}
    >
      <span
        className={cn(
          "mt-0.5 min-w-[68px] flex-none rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium",
          TAG[entry.kind],
        )}
      >
        {w.kinds[entry.kind]}
      </span>
      <div className="grid min-w-0 flex-1 gap-1 [overflow-wrap:anywhere]">
        <span>
          <strong className="font-semibold">{entry.title[locale]}</strong>
          {": "}
          {entry.text[locale]}
        </span>
        {entry.more && (
          <div
            aria-hidden={!more}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              more
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <span className="overflow-hidden">{entry.more[locale]}</span>
          </div>
        )}
        {entry.more && (
          <button
            type="button"
            aria-expanded={more}
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
