// Home (#today), the first page: what needs you, how things are moving,
// and side by side the problems still open (Personas) and the work under
// way (Factory), each row leading to it.

import { ArrowRight, Compass, SquareKanban } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { PageHead } from "@/components/page-head";
import { River } from "@/components/river";
import { RowList } from "@/components/row-list";
import type { BuildView } from "@/api";
import { useChecks } from "@/checks/use-checks";
import type { FactoryState } from "@/dashboard/dashboard";
import { useExploreList } from "@/explore/use-explore";
import { type Need, overviewOf } from "@/lib/overview-view";
import { riverOf } from "@/lib/river";
import type { Row } from "@/lib/rows";
import { type Read, useOverview, useRead } from "@/understand/use-records";

export function OverviewPage({ state }: Readonly<{ state: FactoryState }>) {
  const { t } = useTranslation(["overview", "common"]);
  const { view, river } = useHome(state);
  return (
    <div className="grid content-start gap-5">
      <PageHead title={t("title")} />
      <Needs needs={view.needs} />
      <River {...river} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Part
          title={t("common:nav.personas")}
          icon={<Compass aria-hidden className="text-understand" />}
          rows={view.problems.rows}
          more={view.problems.more}
          href="#understand"
          empty={t("problems.empty")}
        />
        <Part
          title={t("common:nav.factory")}
          icon={<SquareKanban aria-hidden className="text-build" />}
          rows={view.work.rows}
          more={view.work.more}
          href="#build"
          empty={t("work.empty")}
        />
      </div>
    </div>
  );
}

// What Home shows, from what the server sends: the records, the ideas, the
// fixes waiting for a ticket and the Check-up's open findings.
function useHome(state: FactoryState) {
  const { data: understand } = useOverview();
  const { data: explore } = useExploreList();
  const { data: build } = useRead("/api/build") as Read<BuildView>;
  const { data: checks } = useChecks();
  const ideas = explore?.ideas ?? null;
  const findings = (checks?.checks ?? [])
    .flatMap((check) => check.findings)
    .filter((finding) => finding.status === "open");
  return {
    view: overviewOf(understand, ideas, state.work, {
      findings,
      fixes: build?.waiting.length ?? 0,
    }),
    river: riverOf(
      understand?.personas ?? [],
      ideas ?? [],
      understand?.kobold.toLookAt.length ?? 0,
    ),
  };
}

// What waits for a person: what it is about, then what to do.
function Needs({ needs }: Readonly<{ needs: Need[] }>) {
  const { t } = useTranslation("overview");
  return (
    <section
      aria-label={t("needs.title")}
      className="grid gap-3 rounded-[18px] bg-card p-5 shadow-soft"
    >
      <h2 className="text-section">{t("needs.title")}</h2>
      {needs.length === 0 ? (
        <p className="text-body text-muted-foreground">{t("needs.empty")}</p>
      ) : (
        <ul className="grid">
          {needs.map((need) => (
            <li
              key={need.id}
              className="border-t border-border-soft first:border-t-0"
            >
              <a
                href={need.href}
                className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1 truncate text-item">
                  {need.about}
                </span>
                <span className="flex-none text-note font-medium text-primary">
                  {need.action}
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 flex-none text-muted-foreground"
                />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Part({
  title,
  icon,
  rows,
  more,
  href,
  empty,
}: Readonly<{
  title: string;
  icon: ReactNode;
  rows: Row[];
  more: number;
  href: string;
  empty: string;
}>) {
  const { t } = useTranslation("overview");
  return (
    <section
      aria-label={title}
      className="grid gap-3 rounded-[18px] bg-card p-5 shadow-soft"
    >
      <header className="flex items-center gap-2">
        <h2 className="flex items-center gap-1.5 text-section [&_svg]:size-4">
          {icon}
          {title}
        </h2>
        <a
          href={href}
          className="ml-auto text-note font-medium text-primary hover:underline"
        >
          {more > 0 ? t("seeAll", { count: rows.length + more }) : t("open")}
        </a>
      </header>
      <RowList rows={rows} empty={empty} />
    </section>
  );
}
