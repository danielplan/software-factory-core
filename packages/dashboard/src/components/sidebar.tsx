import {
  Building2,
  ChevronsUpDown,
  Lightbulb,
  Menu,
  Package,
  Settings,
  SquareKanban,
  Sun,
  Users,
  Wrench,
} from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { type ReactNode, useState } from "react";

import type { Light } from "@/api";
import { StatusLight } from "@/components/status-light";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SelectContent, SelectItem } from "@/components/ui/select";
import type { Page } from "@/lib/routes";
import type { KoboldStatus } from "@/lib/shell-view";
import { cn } from "@/lib/utils";
import { KoboldMark } from "@/understand/bits";

type Item = { page: Page; name: string; icon: ReactNode };

// The pages, in groups: what is waiting first, then the product chosen at
// the top, the company, and the factory itself. The product's pages each
// have a colour of their own, on their icon.
const GROUPS: { title: string | null; items: Item[] }[] = [
  {
    title: null,
    items: [{ page: "today", name: "Today", icon: <Sun aria-hidden /> }],
  },
  {
    title: "This product",
    items: [
      {
        page: "understand",
        name: "Understand",
        icon: <Users aria-hidden className="text-understand" />,
      },
      {
        page: "explore",
        name: "Explore",
        icon: <Lightbulb aria-hidden className="text-explore" />,
      },
      {
        page: "build",
        name: "Build",
        icon: <SquareKanban aria-hidden className="text-build" />,
      },
    ],
  },
  {
    title: "Company",
    items: [
      { page: "customers", name: "Customers", icon: <Building2 aria-hidden /> },
      { page: "products", name: "Products", icon: <Package aria-hidden /> },
    ],
  },
  {
    title: "Factory",
    items: [
      { page: "workshop", name: "Workshop", icon: <Wrench aria-hidden /> },
      { page: "settings", name: "Settings", icon: <Settings aria-hidden /> },
    ],
  },
];

export type Product = { id: string; name: string };

type SidebarProps = Readonly<{
  current: Page;
  company: string;
  products: Product[];
  chosen: string;
  onChoose: (id: string) => void;
  counts: Partial<Record<Page, number>>;
  kobold: KoboldStatus;
  light: Light;
}>;

// The way around the dashboard: Kobble and the product at the top, the
// pages in their groups with a small count where there is something to
// count, and the kobold's card at the bottom. On the ground at the left of
// a wide screen; on a phone, a bar along the top whose menu opens the same
// list from the side.
export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const { current, counts, kobold, light } = props;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col gap-0.5 overflow-y-auto px-3 py-4 md:flex">
        <Top {...props} />
        <Pages current={current} counts={counts} />
        <KoboldCard kobold={kobold} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 bg-ground px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open the menu">
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[260px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0.5 rounded-none border-0 bg-ground px-3 py-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">Pages</DialogTitle>
            <Top {...props} />
            <Pages
              current={current}
              counts={counts}
              onGo={() => {
                setOpen(false);
              }}
            />
            <KoboldCard kobold={kobold} />
          </DialogContent>
        </Dialog>
        <KoboldMark />
        <span className="font-bold tracking-[-0.02em]">Kobble</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {props.products.find((one) => one.id === props.chosen)?.name ??
            props.company}
        </span>
        <span title={kobold.detail} className="ml-auto flex px-3">
          <StatusLight light={light} />
        </span>
      </header>
    </>
  );
}

// What the kobold is working on, or that it rests, at the bottom.
function KoboldCard({ kobold }: Readonly<{ kobold: KoboldStatus }>) {
  return (
    <div
      role="status"
      className="mt-auto flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5 text-xs shadow-panel"
    >
      <KoboldMark
        className={cn("size-[30px]", kobold.busy && "animate-breathe")}
      />
      <span className="grid min-w-0 gap-px">
        <b className="truncate text-[13px] font-semibold">{kobold.title}</b>
        <span
          className="line-clamp-2 text-muted-foreground"
          title={kobold.detail}
        >
          {kobold.detail}
        </span>
      </span>
    </div>
  );
}

// Kobble, and the product the pages under "This product" are about: a
// choice when there are several, its name when there is one, the
// company's name when there are none yet.
function Top({
  company,
  products,
  chosen,
  onChoose,
}: Pick<SidebarProps, "company" | "products" | "chosen" | "onChoose">) {
  const name = products.find((one) => one.id === chosen)?.name ?? company;
  const tile = (
    <>
      <span
        aria-hidden
        className="grid size-[22px] flex-none place-items-center rounded-md bg-blue text-[11px] font-bold text-blue-foreground"
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="grid min-w-0 text-left leading-[1.15]">
        <span className="truncate text-[13px] font-semibold">{name}</span>
        <span className="truncate text-[11px] text-muted-foreground">
          {company}
        </span>
      </span>
    </>
  );
  const look =
    "flex h-11 w-full items-center gap-2 rounded-[10px] bg-card px-2.5 shadow-panel";
  return (
    <div className="grid gap-2.5 pb-1.5">
      <span className="flex items-center gap-2 px-1.5 text-[19px] font-bold tracking-[-0.02em]">
        <KoboldMark className="size-8" />
        Kobble
      </span>
      {products.length > 1 ? (
        <SelectPrimitive.Root value={chosen} onValueChange={onChoose}>
          <SelectPrimitive.Trigger
            aria-label="Product"
            className={cn(
              look,
              "outline-none hover:bg-surface focus-visible:ring-[3px] focus-visible:ring-ring/50",
            )}
          >
            {tile}
            <ChevronsUpDown
              aria-hidden
              className="ml-auto size-4 flex-none text-muted-foreground"
            />
          </SelectPrimitive.Trigger>
          <SelectContent position="popper" className="w-[208px]">
            {products.map((one) => (
              <SelectItem key={one.id} value={one.id}>
                {one.name}
              </SelectItem>
            ))}
          </SelectContent>
        </SelectPrimitive.Root>
      ) : (
        <div className={look}>{tile}</div>
      )}
    </div>
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
  return (
    <nav aria-label="Pages" className="grid gap-0.5">
      {GROUPS.map((group) => (
        <div key={group.title ?? "first"} className="grid gap-0.5">
          {group.title && (
            <span className="px-2.5 pt-3 pb-1 text-[11px] font-semibold tracking-[0.06em] text-label uppercase">
              {group.title}
            </span>
          )}
          {group.items.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              onClick={onGo}
              aria-current={current === item.page ? "page" : undefined}
              className={cn(
                "flex h-[34px] items-center gap-2.5 rounded-[9px] px-2.5 text-sm text-foreground-2 hover:bg-hover [&_svg]:size-4 [&_svg]:flex-none",
                current === item.page &&
                  "bg-card font-medium text-foreground shadow-current hover:bg-card",
              )}
            >
              {item.icon}
              {item.name}
              {counts[item.page] !== undefined && (
                <span className="ml-auto text-[11px] font-semibold text-muted-foreground">
                  {counts[item.page]}
                </span>
              )}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
