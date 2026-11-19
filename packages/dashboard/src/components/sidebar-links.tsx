// The sidebar's links (sidebar.tsx): one page with its tile, and beside
// System the product's light or Open.

import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import type { Light } from "@/api";
import { StatusLight } from "@/components/status-light";
import { useT } from "@/i18n/use-t";
import type { Page } from "@/lib/routes";
import { cn } from "@/lib/utils";

// Each page with its own colour: its icon on a tint of it.
export type Item = { page: Page; icon: ReactNode; color: string };

// One page in the sidebar: its tile and name, and what it shows beside.
export function PageLink({
  item,
  current,
  onGo,
  quiet = false,
  children,
}: Readonly<{
  item: Item;
  current: Page;
  onGo?: () => void;
  quiet?: boolean;
  children?: ReactNode;
}>) {
  const t = useT().shell;
  return (
    <a
      href={`#${item.page}`}
      onClick={onGo}
      aria-current={current === item.page ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-normal hover:bg-sidebar-hover [&_svg]:size-[14px] [&_svg]:flex-none [&_svg]:stroke-[2]",
        quiet
          ? "text-sidebar-muted hover:text-sidebar-strong"
          : "text-sidebar-foreground",
        current === item.page &&
          "bg-sidebar-active text-sidebar-active-foreground hover:bg-sidebar-active",
      )}
    >
      <Tile color={item.color}>{item.icon}</Tile>
      {t.pages[item.page]}
      {children}
    </a>
  );
}

// Beside System: Open while the product runs, its light otherwise.
export function ProductState({
  product,
}: Readonly<{ product: { light: Light; link: string | null } }>) {
  const t = useT().shell;
  if (product.light === "running" && product.link)
    return (
      <span
        role="link"
        tabIndex={0}
        className="ml-auto inline-flex items-center gap-1 rounded-md border border-sidebar-border bg-card px-1.5 py-0.5 text-[11px] text-sidebar-muted hover:text-sidebar-strong [&_svg]:size-3"
        onClick={(event) => {
          event.preventDefault();
          window.open(product.link ?? "", "_blank", "noreferrer");
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          window.open(product.link ?? "", "_blank", "noreferrer");
        }}
      >
        {t.open} <ExternalLink aria-hidden />
      </span>
    );
  if (product.light === "none" || product.light === "running") return null;
  return (
    <span className="ml-auto flex items-center gap-2 text-xs text-sidebar-muted">
      {t.lights[product.light]}
      <StatusLight light={product.light} />
    </span>
  );
}

// A page's icon on a soft tint of its colour.
export function Tile({
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
