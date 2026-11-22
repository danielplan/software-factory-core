import { Boxes, House, Menu, Puzzle, Settings } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Light, ShownView } from "@/api/client";
import { KoboldHead } from "@/components/kobold-face";
import { type Doing, PageKobold } from "@/components/layout/page-kobold";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Page } from "@/lib/routes";
import { useFactoryName, useLogo } from "@/lib/brand";
import type { SidebarGroup } from "@/lib/page-module";
import type { KoboldStatus } from "@/lib/shell-view";
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

type SidebarProps = Readonly<{
  // The project's name (factory.json), in its wordmark font when its theme
  // gives one; Kobble's own name without one.
  name: string | null;
  current: Page;
  // What is open in the page: for a team's page, which one.
  open: string | null;
  // The installed extensions' pages, each with what it counts beside it.
  pages: (Item & { group: SidebarGroup; count?: ReactNode })[];
  kobold: KoboldStatus;
  // What each kobold does now (lib/kobolds.ts).
  doing: Doing;
  light: Light;
  // The pages the team's own extensions bring, in a group of their own.
  team: ShownView[];
  // The product's light, and where it opens while it runs.
  product: { light: Light; link: string | null };
  // The rows above Settings that the app puts in: an update waiting for
  // the owner, and Send feedback.
  rows: ReactNode;
}>;

// The way around the dashboard: the project's name at the top, Home and
// System, the pages with a count where there is something to count, and
// updates and Settings at the bottom. White, at the left of a wide screen; on a phone, a bar
// along the top whose menu opens the same list from the side.
export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const { kobold, light } = props;
  const t = useTranslation().t;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-0.5 overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-strong px-3 pt-4 pb-3 md:flex">
        <Content {...props} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar text-sidebar-strong px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("shell.openMenu")}
            >
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[264px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0.5 rounded-none border-0 bg-sidebar text-sidebar-strong px-4 pt-[22px] pb-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">{t("shell.menu")}</DialogTitle>
            <Content
              {...props}
              onGo={() => {
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
        <Wordmark name={props.name} size="small" />
        <span title={kobold.detail} className="ml-auto flex px-3">
          <StatusLight light={light} />
        </span>
      </header>
    </>
  );
}

function Content(props: SidebarProps & { onGo?: () => void }) {
  const { current, pages, doing, product, onGo } = props;
  const { team, open } = props;
  const nav = useTranslation().t;
  return (
    <>
      <span className="px-2 pb-4">
        <Wordmark name={props.name} size="big" />
      </span>
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

// "Acme Factory": the company's name in its wordmark, the rest plainly;
// the factory's own name whole when it does not start with the company's.
function splitName(
  name: string | null,
  own: string | null,
): { mark: string; rest: string | null } {
  if (!own) return { mark: name ?? "kobble", rest: null };
  if (!name || !own.toLowerCase().startsWith(name.toLowerCase()))
    return { mark: own, rest: null };
  return { mark: name, rest: own.slice(name.length).trim() || null };
}

// The mark beside the name: the company's logo, the kobold for Kobble's own
// look, nothing when the theme leaves it out.
function Mark({ big }: Readonly<{ big: boolean }>) {
  const logo = useLogo();
  if (logo === "none") return null;
  if (!logo) return <KoboldHead size={big ? 32 : 26} />;
  return (
    <img
      src={logo}
      alt=""
      className={cn("flex-none rounded-lg", big ? "size-8" : "size-[26px]")}
    />
  );
}

// The project's name in its wordmark font (or the factory's own name, the
// company's part in the wordmark), with its mark; "kobble" without a name.
function Wordmark({
  name,
  size,
}: Readonly<{ name: string | null; size: "big" | "small" }>) {
  const big = size === "big";
  const { mark, rest } = splitName(name, useFactoryName());
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-2.5 font-wordmark text-[21px] leading-none tracking-[-0.02em] [font-weight:var(--wordmark-weight,700)] [text-transform:var(--wordmark-case,none)]",
      )}
    >
      <Mark big={big} />
      <span className="truncate">
        {mark}
        {rest && (
          <span className="ml-2 font-body text-[0.72em] font-medium tracking-normal normal-case opacity-80">
            {rest}
          </span>
        )}
      </span>
    </span>
  );
}

function Pages({
  current,
  pages,
  doing,
  onGo,
}: Readonly<{
  current: Page;
  pages: SidebarProps["pages"];
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
