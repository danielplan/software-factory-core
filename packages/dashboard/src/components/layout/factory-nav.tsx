// The factory's rows in the sidebar (sidebar.tsx): its pages, with what
// each counts and which kobold works there.

import { Boxes, House, Puzzle, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { Light, ShownView } from "@/api/client";
import { type Doing, PageKobold } from "@/components/layout/page-kobold";
import type { Page } from "@/lib/routes";
import type { SidebarGroup } from "@/lib/page-module";
import { cn } from "@/lib/utils";

import { type Item, PageLink, ProductState } from "./sidebar-links";
import { GroupLabel, TeamPages } from "./team-pages";

// Home and System at the top (System with the product's light, or Open when
// it runs), then the installed extensions' pages in labelled groups: the
// work, from what came in to what is built (Signals, Explorations, the
// Factory board, Releases), then the customers (the personas). Explorations
// is still the page "explore" and the Factory board the page "build". At
// the bottom, updates when they need the owner and Send feedback (the rows
// the app puts in), the Marketplace and Settings.
const TOP: Item[] = [
  {
    page: "home",
    icon: <House aria-hidden />,
    color: "var(--foreground)",
  },
  {
    page: "system",
    icon: <Boxes aria-hidden />,
    color: "var(--source-usage)",
  },
];

const GROUPS: SidebarGroup[] = ["work", "customers"];

const QUIET: Item[] = [
  {
    page: "extensions",
    icon: <Puzzle aria-hidden />,
    color: "#667085",
  },
  {
    page: "settings",
    icon: <Settings aria-hidden />,
    color: "#667085",
  },
];

type FactoryNavProps = Readonly<{
  current: Page;
  // What is open in the page: for a team's page, which one.
  open: string | null;
  // The installed extensions' pages, each with what it counts beside it.
  pages: (Item & { group: SidebarGroup; count?: ReactNode })[];
  // What each kobold does now (lib/kobolds.ts).
  doing: Doing;
  // The pages the team's own extensions bring, in a group of their own.
  team: ShownView[];
  // The product's light, and where it opens while it runs.
  product: { light: Light; link: string | null };
  // The rows above Settings that the app puts in: an update waiting for
  // the owner, and Send feedback.
  rows: ReactNode;
  onGo?: () => void;
}>;

export function FactoryNav(props: FactoryNavProps) {
  const { current, pages, doing, product, onGo } = props;
  const { team, open } = props;
  const nav = useTranslation().t;
  return (
    <>
      <nav aria-label={nav("shell.nav.overview")} className="grid gap-px pb-4">
        {TOP.map((item) => (
          <PageLink key={item.page} item={item} current={current} onGo={onGo}>
            {item.page === "system" && <ProductState product={product} />}
          </PageLink>
        ))}
      </nav>
      <Pages current={current} pages={pages} doing={doing} onGo={onGo} />
      <TeamPages
        pages={team}
        current={current === "team" ? open : null}
        onGo={onGo}
      />
      <div className="mt-auto grid gap-0.5 pt-4">
        {props.rows}
        <nav aria-label={nav("shell.nav.factory")} className="grid gap-0.5">
          {QUIET.map((item) => (
            <PageLink
              key={item.page}
              item={item}
              current={current}
              onGo={onGo}
              quiet
            />
          ))}
        </nav>
      </div>
    </>
  );
}

function Pages({
  current,
  pages,
  doing,
  onGo,
}: Readonly<{
  current: Page;
  pages: FactoryNavProps["pages"];
  doing: Doing;
  onGo?: () => void;
}>) {
  const t = useTranslation().t;
  // A group with none of the installed pages is left out.
  const groups = GROUPS.map((label) => ({
    label,
    items: pages.filter((page) => page.group === label),
  })).filter((group) => group.items.length > 0);
  return (
    <nav aria-label={t("shell.nav.pages")} className="grid gap-px">
      {groups.map((group, at) => (
        <div key={group.label} className={cn("grid gap-px", at > 0 && "pt-4")}>
          <GroupLabel>{t(`shell.groups.${group.label}`)}</GroupLabel>
          {group.items.map((item) => (
            <PageLink key={item.page} item={item} current={current} onGo={onGo}>
              <span className="ml-auto flex items-center gap-2">
                <PageKobold page={item.page} doing={doing} />
                {item.count}
              </span>
            </PageLink>
          ))}
        </div>
      ))}
    </nav>
  );
}
