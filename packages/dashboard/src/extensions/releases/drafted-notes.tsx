// The notes the kobold drafted when the team prepared the release, in the
// page's language (English when it has none in it): each change with its
// kind, its bold title and its text. They go on the release as they are,
// with the same notes in English, Italian and German.

import { useTranslation } from "react-i18next";

import type { ReleasesView } from "@/api/client";
import { Markdown } from "@/components/markdown";
import { useLocale } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

type Notes = NonNullable<
  Extract<ReleasesView, { connected: true }>["coming"]["notes"]
>;

const KIND_LOOK = {
  New: "bg-[color:var(--solved)] text-[color:var(--solved-foreground)]",
  Changed: "bg-[color:var(--build)]/10 text-[color:var(--build)]",
  Fixed: "bg-[color:var(--explore)]/15 text-[#8a5a00]",
};

export function DraftedNotes({ notes }: Readonly<{ notes: Notes | null }>) {
  const t = useTranslation().t;
  const locale = useLocale();
  const own = notes?.[locale];
  const changes = own && own.length > 0 ? own : (notes?.en ?? []);
  return (
    <div className="grid gap-2">
      <h3 className="text-[13px] font-medium">{t("releases.notes")}</h3>
      {changes.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {t("releases.notesListed")}
        </p>
      ) : (
        <>
          <p className="text-[13px] text-muted-foreground">
            {t("releases.notesAbout")}
          </p>
          <ul className="grid gap-1.5">
            {changes.map((change, index) => (
              <li
                key={`${change.title}-${String(index)}`}
                className="text-[13px] leading-relaxed"
              >
                <span
                  className={cn(
                    "mr-2 inline-block rounded-md px-1.5 py-px text-[11.5px] font-semibold",
                    KIND_LOOK[change.kind],
                  )}
                >
                  {t(`releases.kinds.${change.kind}`)}
                </span>
                <span className="font-semibold">
                  <Markdown text={change.title} inline />
                </span>{" "}
                <Markdown text={change.text} inline />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
