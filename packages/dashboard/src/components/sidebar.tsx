import {
  ChevronsUpDown,
  FlaskConical,
  Inbox,
  Menu,
  Settings,
  Columns3,
  Users,
  Wrench,
} from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { type ReactNode, useState } from "react";

import type { Light } from "@/api";
import { KoboldHead } from "@/components/kobold-face";
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
import { koboldLine, type KoboldStatus } from "@/lib/shell-view";
import { cn } from "@/lib/utils";

type Item = { page: Page; name: string; icon: ReactNode };

// The pages: the way from what came in to what is built (Signals,
// Explorations, the Factory board), then, a little apart, the personas.
// Explorations is still the page "explore" and the Factory board the page
// "build". Workshop and Settings sit quietly under the kobold's card.
const GROUPS: Item[][] = [
  [
    { page: "signals", name: "Signals", icon: <Inbox aria-hidden /> },
    {
      page: "explore",
      name: "Explorations",
      icon: <FlaskConical aria-hidden />,
    },
    { page: "build", name: "Factory", icon: <Columns3 aria-hidden /> },
  ],
  [{ page: "personas", name: "Personas", icon: <Users aria-hidden /> }],
];

const QUIET: Item[] = [
  { page: "settings", name: "Settings", icon: <Settings aria-hidden /> },
  { page: "workshop", name: "Workshop", icon: <Wrench aria-hidden /> },
];

// The pages whose count is something waiting for you, shown as a badge.
const BADGED = new Set<Page>(["signals"]);

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

// The way around the dashboard: Kobble at the top (and the product, when
// the company has several), the pages with a count where there is
// something to count, the kobold's card at the bottom and Settings and
// Workshop under it. White, at the left of a wide screen; on a phone, a bar
// along the top whose menu opens the same list from the side.
export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = useState(false);
  const { kobold, light } = props;
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-0.5 overflow-y-auto border-r border-border bg-card px-4 pt-[22px] pb-4 md:flex">
        <Content {...props} />
      </aside>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-2 md:hidden">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open the menu">
              <Menu aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent className="top-0 left-0 flex h-full w-[264px] max-w-[85vw] translate-x-0 translate-y-0 flex-col gap-0.5 rounded-none border-0 bg-card px-4 pt-[22px] pb-4 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:max-w-[85vw]">
            <DialogTitle className="sr-only">Pages</DialogTitle>
            <Content
              {...props}
              onGo={() => {
                setOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
        <KoboldHead size={26} />
        <span className="font-display text-lg font-bold tracking-[-0.02em]">
          kobble
        </span>
        <span title={kobold.detail} className="ml-auto flex px-3">
          <StatusLight light={light} />
        </span>
      </header>
    </>
  );
}

function Content(props: SidebarProps & { onGo?: () => void }) {
  const { current, counts, kobold, light, onGo } = props;
  return (
    <>
      <span className="flex items-center gap-2.5 px-1.5 pb-[18px] font-display text-[22px] font-bold tracking-[-0.02em]">
        <KoboldHead size={32} />
        kobble
      </span>
      {props.products.length > 1 && <ProductChoice {...props} />}
      <Pages current={current} counts={counts} onGo={onGo} />
      <KoboldCard kobold={kobold} />
      <nav aria-label="The factory" className="mt-1.5 flex items-center">
        {QUIET.map((item) => (
          <a
            key={item.page}
            href={`#${item.page}`}
            onClick={onGo}
            aria-current={current === item.page ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground [&_svg]:size-4",
              current === item.page && "text-wash-foreground",
            )}
          >
            {item.icon}
            {item.name}
          </a>
        ))}
        <span title={kobold.detail} className="ml-auto flex px-3">
          <StatusLight light={light} />
        </span>
      </nav>
    </>
  );
}

// What the kobold is doing, or that it is idle, on a dotted card.
function KoboldCard({ kobold }: Readonly<{ kobold: KoboldStatus }>) {
  return (
    <div className="mt-auto flex flex-col gap-2.5 rounded-2xl bg-card bg-[radial-gradient(var(--tint-line)_1px,transparent_1px)] bg-size-[10px_10px] p-3.5 shadow-panel">
      <div
        role="status"
        className="flex items-center gap-2.5 rounded-xl bg-card p-2.5 shadow-[0_0_0_1px_var(--border-soft)]"
      >
        <KoboldHead
          size={36}
          className={cn(kobold.busy && "animate-breathe")}
        />
        <span className="grid min-w-0">
          <b className="text-[13.5px] font-semibold">Your kobold</b>
          <small
            className="truncate text-xs text-muted-foreground"
            title={kobold.detail}
          >
            <span
              aria-hidden
              className="mr-1.5 inline-block size-[7px] rounded-full bg-source-app align-[1px]"
            />
            {koboldLine(kobold)}
          </small>
        </span>
      </div>
    </div>
  );
}

// The product the pages are about, when the company has several.
function ProductChoice({
  products,
  chosen,
  onChoose,
}: Pick<SidebarProps, "products" | "chosen" | "onChoose">) {
  const name = products.find((one) => one.id === chosen)?.name ?? "";
  return (
    <SelectPrimitive.Root value={chosen} onValueChange={onChoose}>
      <SelectPrimitive.Trigger
        aria-label="Product"
        className="mb-[18px] flex h-10 w-full items-center gap-2 rounded-xl bg-ground px-3 text-sm font-medium outline-none hover:bg-hover focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="truncate">{name}</span>
        <ChevronsUpDown
          aria-hidden
          className="ml-auto size-4 flex-none text-muted-foreground"
        />
      </SelectPrimitive.Trigger>
      <SelectContent position="popper" className="w-[224px]">
        {products.map((one) => (
          <SelectItem key={one.id} value={one.id}>
            {one.name}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectPrimitive.Root>
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
      {GROUPS.map((group, at) => (
        <div key={at} className={cn("grid gap-0.5", at > 0 && "pt-3.5")}>
          {group.map((item) => (
            <a
              key={item.page}
              href={`#${item.page}`}
              onClick={onGo}
              aria-current={current === item.page ? "page" : undefined}
              className={cn(
                "flex h-[42px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground-2 hover:bg-ground [&_svg]:size-[19px] [&_svg]:flex-none [&_svg]:stroke-[1.9]",
                current === item.page &&
                  "bg-wash text-wash-foreground hover:bg-wash",
              )}
            >
              {item.icon}
              {item.name}
              <Count page={item.page} n={counts[item.page]} />
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
    <span className="ml-auto grid h-[22px] min-w-[22px] place-items-center rounded-[11px] bg-blue px-[7px] text-[11.5px] font-semibold text-blue-foreground">
      {n}
    </span>
  ) : (
    <span className="ml-auto text-xs text-faint">{n}</span>
  );
}
