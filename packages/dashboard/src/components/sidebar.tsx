import {
  Building2,
  Lightbulb,
  Menu,
  Package,
  Settings,
  SquareKanban,
  Sun,
  Users,
  Wrench,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Item = { page: Page; name: string; icon: ReactNode };

// The pages, in groups: what is waiting first, then the product chosen at
// the top, the company, and the factory itself.
const GROUPS: { title: string | null; items: Item[] }[] = [
  {
    title: null,
    items: [{ page: "today", name: "Today", icon: <Sun aria-hidden /> }],
  },
  {
    title: "This product",
    items: [
      { page: "understand", name: "Understand", icon: <Users aria-hidden /> },
      { page: "explore", name: "Explore", icon: <Lightbulb aria-hidden /> },
      { page: "build", name: "Build", icon: <SquareKanban aria-hidden /> },
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

type Product = { id: string; name: string };

type SidebarProps = Readonly<{
  current: Page;
  company: string;
  products: Product[];
  status: { lit: Light; words: string };
}>;

// The way around the dashboard: Kobble and the product at the top, the
// pages in their groups, the whole factory's light at the bottom. Against
// the left edge on a wide screen; on a phone, a bar along the top whose
// menu opens the same list from the side.
export function Sidebar({ current, company, products, status }: SidebarProps) {
  const [picked, choose] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  // The one picked, while it is still there; the first one otherwise.
  const chosen =
    products.find((one) => one.id === picked)?.id ?? products[0]?.id ?? "";
  const top = (
    <Top company={company} products={products} chosen={chosen} on={choose} />
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col gap-4 border-r border-border-soft bg-card px-3 py-4 md:flex">
        {top}
        <Pages current={current} />
        <Status {...status} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-border-soft bg-card px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open the menu">
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[260px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-4 rounded-none border-0 border-r border-border-soft bg-card px-3 py-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">Pages</DialogTitle>
            {top}
            <Pages
              current={current}
              onGo={() => {
                setOpen(false);
              }}
            />
            <Status {...status} />
          </DialogContent>
        </Dialog>
        <span className="font-semibold">Kobble</span>
        <span className="min-w-0 truncate text-sm text-muted-foreground">
          {products.find((one) => one.id === chosen)?.name ?? company}
        </span>
        <span title={status.words} className="ml-auto flex px-3">
          <StatusLight light={status.lit} />
        </span>
      </header>
    </>
  );
}

// The whole factory's light, with its words, at the bottom.
function Status({ lit, words }: Readonly<{ lit: Light; words: string }>) {
  return (
    <div className="mt-auto flex items-center gap-2.5 px-2.5 pt-3 text-sm text-muted-foreground">
      <StatusLight light={lit} />
      {words}
    </div>
  );
}

// Kobble, and the product the pages under "This product" are about: its
// name, a choice when there are several, the company's name when there are
// none yet.
function Top({
  company,
  products,
  chosen,
  on,
}: Readonly<{
  company: string;
  products: Product[];
  chosen: string;
  on: (id: string) => void;
}>) {
  return (
    <div className="grid gap-1.5 px-2.5">
      <span className="text-lg font-semibold tracking-[-0.01em]">Kobble</span>
      {products.length > 1 ? (
        <Select value={chosen} onValueChange={on}>
          <SelectTrigger
            aria-label="Product"
            className="-mx-2.5 h-9 w-[calc(100%+1.25rem)] border-0 bg-surface-2 shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {products.map((one) => (
              <SelectItem key={one.id} value={one.id}>
                {one.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="truncate text-sm text-muted-foreground">
          {products[0]?.name ?? company}
        </span>
      )}
    </div>
  );
}

function Pages({
  current,
  onGo,
}: Readonly<{ current: Page; onGo?: () => void }>) {
  return (
    <nav aria-label="Pages" className="grid gap-3">
      {GROUPS.map((group) => (
        <div key={group.title ?? "first"} className="grid gap-0.5">
          {group.title && (
            <span className="px-2.5 pb-1 text-xs font-medium text-muted-foreground">
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
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground [&_svg]:size-4",
                current === item.page &&
                  "bg-surface-2 font-medium text-foreground",
              )}
            >
              {item.icon}
              {item.name}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
