import {
  FlaskConical,
  Inbox,
  Menu,
  Settings,
  Columns3,
  Users,
  Wrench,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import type { Light } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
import { type Doing, PageKobold } from "@/components/page-kobold";
import { LABEL, StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Page } from "@/lib/routes";
import { useFactoryName, useLogo } from "@/lib/brand";
import type { KoboldStatus } from "@/lib/shell-view";
import { cn } from "@/lib/utils";

// Each page with its own colour: its icon on a tint of it.
type Item = { page: Page; name: string; icon: ReactNode; color: string };

// The pages, in labelled groups: the work, from what came in to what is
// built (Signals, Explorations, the Factory board), then the customers (the
// personas). Explorations is still the page "explore" and the Factory board
// the page "build". Settings and Workshop sit quietly under the kobold's
// card.
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Work",
    items: [
      {
        page: "signals",
        name: "Signals",
        icon: <Inbox aria-hidden />,
        color: "var(--understand)",
      },
      {
        page: "explore",
        name: "Explorations",
        icon: <FlaskConical aria-hidden />,
        color: "var(--explore)",
      },
      {
        page: "build",
        name: "Factory",
        icon: <Columns3 aria-hidden />,
        color: "var(--build)",
      },
    ],
  },
  {
    label: "Customers",
    items: [
      {
        page: "personas",
        name: "Personas",
        icon: <Users aria-hidden />,
        color: "var(--source-app)",
      },
    ],
  },
];

function GroupLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="px-2.5 pb-1 text-[11px] font-medium text-sidebar-muted">
      {children}
    </span>
  );
}

const QUIET: Item[] = [
  {
    page: "settings",
    name: "Settings",
    icon: <Settings aria-hidden />,
    color: "#667085",
  },
  {
    page: "workshop",
    name: "Workshop",
    icon: <Wrench aria-hidden />,
    color: "#7a5af8",
  },
];

// The pages whose count is something waiting for you, shown as a badge.
const BADGED = new Set<Page>(["signals"]);

type SidebarProps = Readonly<{
  // The project's name (factory.json), in its wordmark font when its theme
  // gives one; Kobble's own name without one.
  name: string | null;
  current: Page;
  counts: Partial<Record<Page, number>>;
  kobold: KoboldStatus;
  // What each kobold does now (lib/kobolds.ts).
  doing: Doing;
  light: Light;
}>;

// The way around the dashboard: the project's name at the top, the pages with a count where there is
// something to count, the kobold's card at the bottom and Settings and
// Workshop under it. White, at the left of a wide screen; on a phone, a bar
// along the top whose menu opens the same list from the side.
export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const { kobold, light } = props;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col gap-0.5 overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-strong px-3 pt-4 pb-3 md:flex">
        <Content {...props} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar text-sidebar-strong px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open the menu">
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[264px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0.5 rounded-none border-0 bg-sidebar text-sidebar-strong px-4 pt-[22px] pb-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">Pages</DialogTitle>
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
  const { current, counts, kobold, light, doing, onGo } = props;
  return (
    <>
      <span className="px-2 pb-4">
        <Wordmark name={props.name} size="big" />
      </span>
      <Pages current={current} counts={counts} doing={doing} onGo={onGo} />
      <nav aria-label="The factory" className="mt-auto grid gap-0.5">
        {QUIET.map((item) => (
          <a
            key={item.page}
            href={`#${item.page}`}
            onClick={onGo}
            aria-current={current === item.page ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-normal text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-strong [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]",
              current === item.page &&
                "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
            )}
          >
            <Tile color={item.color}>{item.icon}</Tile>
            {item.name}
            {item.page === "workshop" &&
              light !== "running" &&
              light !== "none" && (
                <span
                  title={kobold.detail}
                  className="ml-auto flex items-center gap-2 text-xs font-normal"
                >
                  {LABEL[light]}
                  <StatusLight light={light} />
                </span>
              )}
          </a>
        ))}
      </nav>
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
  counts,
  doing,
  onGo,
}: Readonly<{
  current: Page;
  counts: Partial<Record<Page, number>>;
  doing: Doing;
  onGo?: () => void;
}>) {
  return (
    <nav aria-label="Pages" className="grid gap-px">
      {GROUPS.map((group, at) => (
        <div key={group.label} className={cn("grid gap-px", at > 0 && "pt-4")}>
          <GroupLabel>{group.label}</GroupLabel>
          {group.items.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              onClick={onGo}
              aria-current={current === item.page ? "page" : undefined}
              className={cn(
                "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-normal text-sidebar-foreground hover:bg-sidebar-hover [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]",
                current === item.page &&
                  "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
              )}
            >
              <Tile color={item.color}>{item.icon}</Tile>
              {item.name}
              <span className="ml-auto flex items-center gap-2">
                <PageKobold page={item.page} doing={doing} />
                <Count page={item.page} n={counts[item.page]} />
              </span>
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

function Count({ page, n }: Readonly<{ page: Page; n: number | undefined }>) {
  if (n === undefined) return null;
  return BADGED.has(page) ? (
    <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-md bg-wash px-1.5 text-[11px] font-medium text-wash-foreground">
      {n}
    </span>
  ) : (
    <span className="ml-auto text-xs text-sidebar-muted">{n}</span>
  );
}

// A page's icon on a soft tint of its colour.
function Tile({
  color,
  children,
}: Readonly<{ color: string; children: ReactNode }>) {
  return (
    <span
      className="grid size-[22px] flex-none place-items-center rounded-md"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 13%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
