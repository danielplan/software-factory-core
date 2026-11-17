import {
  Boxes,
  FlaskConical,
  House,
  Inbox,
  Menu,
  Settings,
  SquareKanban,
  Users,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Page } from "@/lib/routes";
import type { KoboldStatus } from "@/lib/shell-view";
import { cn } from "@/lib/utils";
import { KoboldMark } from "@/understand/bits";

import { KoboldCard, Trouble } from "./kobold-card";

// A page in the sidebar: where it leads, the key of its name, its icon.
type Item = {
  page: Page;
  name:
    | "home"
    | "signals"
    | "explorations"
    | "factory"
    | "personas"
    | "product"
    | "settings";
  icon: ReactNode;
};

// The product's way, from what comes in to what is built: Home, Signals
// (what people said, and the Check-up), Explorations (ideas and their
// prototypes) and Factory (the board); then the people it is for. Chat is
// the kobold's card at the bottom; Product and Settings are small links
// above it.
const MAIN: Item[] = [
  { page: "today", name: "home", icon: <House aria-hidden /> },
  {
    page: "signals",
    name: "signals",
    icon: <Inbox aria-hidden className="text-understand" />,
  },
  {
    page: "explore",
    name: "explorations",
    icon: <FlaskConical aria-hidden className="text-explore" />,
  },
  {
    page: "build",
    name: "factory",
    icon: <SquareKanban aria-hidden className="text-build" />,
  },
];
const PEOPLE: Item = {
  page: "understand",
  name: "personas",
  icon: <Users aria-hidden className="text-understand" />,
};
const SMALL: Item[] = [
  { page: "products", name: "product", icon: <Boxes aria-hidden /> },
  { page: "settings", name: "settings", icon: <Settings aria-hidden /> },
];

// The page lit in the sidebar: the Check-up is part of Signals.
const litFor = (page: Page): Page => (page === "checks" ? "signals" : page);

type SidebarProps = Readonly<{
  current: Page;
  counts: Partial<Record<Page, number>>;
  kobold: KoboldStatus;
  // Something in the factory could not start: a line says so, to Product.
  trouble: boolean;
}>;

// The way around the dashboard: Kobble at the top, the pages with a small
// count where there is something to count, and at the bottom Product and
// Settings, then the kobold's card, which opens the chat. On the ground at
// the left of a wide screen; on a phone, a bar along the top whose menu
// opens the same list from the side.
export function Sidebar({
  current: page,
  counts,
  kobold,
  trouble,
}: SidebarProps) {
  const { t } = useTranslation();
  const current = litFor(page);
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <>
      <aside className="sticky top-3 z-30 hidden h-[calc(100dvh-1.5rem)] w-[232px] flex-none flex-col gap-0.5 self-start overflow-y-auto px-3 py-4 md:flex">
        <Logo />
        <Pages current={current} counts={counts} />
        <Bottom current={current} kobold={kobold} trouble={trouble} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 bg-ground px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("nav.openMenu")}>
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[260px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0.5 rounded-none border-0 bg-ground px-3 py-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">{t("nav.pages")}</DialogTitle>
            <Logo />
            <Pages current={current} counts={counts} onGo={close} />
            <Bottom
              current={current}
              kobold={kobold}
              trouble={trouble}
              onGo={close}
            />
          </DialogContent>
        </Dialog>
        <KoboldMark />
        <span className="text-section">Kobble</span>
        <span className="ml-auto flex items-center gap-3 px-2">
          {trouble && <Trouble short />}
          <a
            href="#chat"
            aria-label={t("nav.chatWithKobold")}
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <KoboldMark
              className={cn(
                "size-7",
                kobold.busy ? "animate-breathe" : "opacity-60 grayscale",
              )}
            />
          </a>
        </span>
      </header>
    </>
  );
}

function Logo() {
  return (
    <span className="flex items-center gap-2 px-1.5 pb-3 text-section">
      <KoboldMark className="size-8" />
      Kobble
    </span>
  );
}

function Pages({
  current,
  counts,
  onGo,
}: Readonly<{
  current: Page;
  counts: Partial<Record<Page, number>>;
  onGo?: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.pages")} className="grid gap-0.5">
      {MAIN.map((item) => (
        <PageLink
          key={item.page}
          item={item}
          current={current}
          count={counts[item.page]}
          onGo={onGo}
        />
      ))}
      <span aria-hidden className="h-3.5" />
      <PageLink item={PEOPLE} current={current} onGo={onGo} />
    </nav>
  );
}

function PageLink({
  item,
  current,
  count,
  onGo,
}: Readonly<{
  item: Item;
  current: Page;
  count?: number;
  onGo?: () => void;
}>) {
  const { t } = useTranslation();
  return (
    <a
      href={`#${item.page}`}
      onClick={onGo}
      aria-current={current === item.page ? "page" : undefined}
      className={cn(
        "flex h-[34px] items-center gap-2.5 rounded-[9px] px-2.5 text-body text-foreground-2 transition-colors hover:bg-hover [&_svg]:size-4 [&_svg]:flex-none",
        current === item.page &&
          "bg-card font-medium text-foreground shadow-current hover:bg-card",
      )}
    >
      {item.icon}
      {t(`nav.${item.name}`)}
      {count !== undefined && (
        <span className="ml-auto rounded-full bg-primary/10 px-1.5 text-tag text-primary">
          {count}
        </span>
      )}
    </a>
  );
}

// Product and Settings, small, side by side; then the kobold's card.
function Bottom({
  current,
  kobold,
  trouble,
  onGo,
}: Readonly<{
  current: Page;
  kobold: KoboldStatus;
  trouble: boolean;
  onGo?: () => void;
}>) {
  return (
    <div className="mt-auto pt-4">
      <KoboldCard kobold={kobold} here={current === "chat"} onGo={onGo}>
        {SMALL.map((item) => (
          <SmallLink
            key={item.page}
            item={item}
            here={current === item.page}
            alert={item.page === "products" && trouble}
            onGo={onGo}
          />
        ))}
      </KoboldCard>
    </div>
  );
}

// Product or Settings, as an icon beside the kobold; Product has a red dot
// when something in the factory could not start.
function SmallLink({
  item,
  here,
  alert,
  onGo,
}: Readonly<{ item: Item; here: boolean; alert: boolean; onGo?: () => void }>) {
  const { t } = useTranslation();
  const name = alert ? t("status.needsYou") : t(`nav.${item.name}`);
  return (
    <a
      href={`#${item.page}`}
      onClick={onGo}
      aria-label={name}
      title={name}
      aria-current={here ? "page" : undefined}
      className={cn(
        "relative grid size-8 flex-none place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-4",
        here && "bg-surface-2 text-foreground",
      )}
    >
      {item.icon}
      {alert && (
        <span
          aria-hidden
          className="absolute top-1 right-1 size-2 rounded-full bg-destructive ring-2 ring-card"
        />
      )}
    </a>
  );
}
