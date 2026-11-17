// A list of rows, the same everywhere (lib/rows.ts): the title, for whom,
// where it stands as a coloured dot and a word, and an arrow to open it.

import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Row } from "@/lib/rows";
import type { StepTone } from "@/lib/stages";
import { cn } from "@/lib/utils";

export const DOT: Record<StepTone, string> = {
  neutral: "bg-foreground-2",
  amber: "bg-explore",
  blue: "bg-build",
  green: "bg-success",
  pink: "bg-fresh",
};

export function RowList({
  rows,
  empty,
}: Readonly<{ rows: Row[]; empty: string }>) {
  const { t } = useTranslation("overview");
  if (rows.length === 0)
    return <p className="py-3 text-body text-muted-foreground">{empty}</p>;
  return (
    <ul className="grid">
      {rows.map((row) => (
        <li
          key={row.id}
          className="border-t border-border-soft first:border-t-0"
        >
          <a
            href={row.href}
            className={cn(
              "-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              row.done && "text-muted-foreground",
            )}
          >
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex items-center gap-2">
                <span className="truncate text-item">{row.title}</span>
                {row.fresh && (
                  <span className="rounded-full bg-open px-1.5 text-tag text-open-foreground">
                    {t("rows.new")}
                  </span>
                )}
              </span>
              {row.who && (
                <span className="truncate text-note text-muted-foreground">
                  {row.who}
                </span>
              )}
            </span>
            <span className="flex flex-none items-center gap-1.5 text-tag font-medium text-foreground-2">
              <span
                aria-hidden
                className={cn("size-2 rounded-full", DOT[row.tone])}
              />
              {row.status}
            </span>
            <ChevronRight
              aria-hidden
              className="size-4 flex-none text-muted-foreground"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
