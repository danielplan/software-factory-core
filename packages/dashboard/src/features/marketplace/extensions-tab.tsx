// The Marketplace's first tab: a search field and filters, then the
// extensions as cards, the installed ones first, and at the end the way to
// an extension of the team's own (make-own.tsx).

import { Download, Search as SearchIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { AddOnView } from "@/api/client";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/lib/field-style";
import {
  extensionThing,
  type Filter,
  FILTERS,
  matching,
} from "@/lib/market-view";

import { cn } from "@/lib/utils";

import { Card } from "./card";
import { MakeOwn } from "./make-own";

// The installed extensions first, then those to install.
const SECTIONS = ["installed", "available"] as const;

export function ExtensionsTab({
  addOns,
  fresh,
  leaving,
  onOpen,
  onInstall,
}: Readonly<{
  addOns: AddOnView[];
  // The ones just installed, and the one on its way out.
  fresh: string[];
  leaving: string | null;
  onOpen: (key: string) => void;
  onInstall: (addOn: AddOnView) => void;
}>) {
  const t = useTranslation().t;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const shown = matching(addOns, t, filter, query);
  return (
    <>
      <Search
        query={query}
        filter={filter}
        onQuery={setQuery}
        onFilter={setFilter}
      />
      {shown.length === 0 ? (
        <p className="px-1 py-8 text-center text-[13px] text-muted-foreground">
          {t("market.noMatch")}
        </p>
      ) : (
        SECTIONS.map((section) => (
          <Shelf
            key={section}
            section={section}
            list={shown.filter(
              (addOn) => addOn.on === (section === "installed"),
            )}
            addOns={addOns}
            fresh={fresh}
            leaving={leaving}
            onOpen={onOpen}
            onInstall={onInstall}
          />
        ))
      )}
      <MakeOwn />
    </>
  );
}

// The search field and the filters beside it.
function Search({
  query,
  filter,
  onQuery,
  onFilter,
}: Readonly<{
  query: string;
  filter: Filter;
  onQuery: (query: string) => void;
  onFilter: (filter: Filter) => void;
}>) {
  const t = useTranslation().t;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className={cn(FIELD, "pl-8")}
          value={query}
          placeholder={t("market.search")}
          aria-label={t("market.search")}
          onChange={(event) => {
            onQuery(event.target.value);
          }}
        />
      </label>
      <div
        role="group"
        aria-label={t("market.filterLabel")}
        className="flex flex-wrap gap-1.5"
      >
        {FILTERS.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={filter === name}
            onClick={() => {
              onFilter(name);
            }}
            className={cn(
              "h-8 rounded-lg border px-3 text-[13px]",
              filter === name
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card hover:bg-hover",
            )}
          >
            {t(`market.filters.${name}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

// The installed ones, or the available ones, as cards under a title.
function Shelf({
  section,
  list,
  addOns,
  fresh,
  leaving,
  onOpen,
  onInstall,
}: Readonly<{
  section: "installed" | "available";
  list: AddOnView[];
  addOns: AddOnView[];
  fresh: string[];
  leaving: string | null;
  onOpen: (key: string) => void;
  onInstall: (addOn: AddOnView) => void;
}>) {
  const t = useTranslation().t;
  if (list.length === 0) return null;
  return (
    <section
      aria-label={t(`market.sections.${section}`)}
      className="grid gap-3"
    >
      <h2 className="flex items-center gap-2 px-1 text-[15px] font-semibold">
        {t(`market.sections.${section}`)}
        <span className="text-[12.5px] font-normal text-muted-foreground">
          {list.length}
        </span>
      </h2>
      <div className="m-stagger grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((addOn) => (
          <Card
            key={addOn.id}
            thing={extensionThing(t, t, addOns, addOn)}
            fresh={fresh.includes(addOn.id)}
            leaving={leaving === addOn.id}
            onOpen={() => {
              onOpen(`extension:${addOn.id}`);
            }}
            action={
              addOn.on ? null : (
                <InstallButton
                  onInstall={() => {
                    onInstall(addOn);
                  }}
                />
              )
            }
          />
        ))}
      </div>
    </section>
  );
}

export function InstallButton({
  onInstall,
}: Readonly<{ onInstall: () => void }>) {
  const t = useTranslation().t;
  return (
    <Button size="pill" onClick={onInstall}>
      <Download aria-hidden />
      {t("market.install")}
    </Button>
  );
}
