// The small pieces the Marketplace's cards and details share: a chip, a
// section of the details with its rows, and the products that use a kit.

import type { ReactNode } from "react";

import { useT } from "@/i18n/use-t";
import { cn } from "@/lib/utils";

// A small pill; clickable when it leads somewhere.
export function Chip({
  label,
  onClick,
}: Readonly<{ label: string; onClick?: () => void }>) {
  const look =
    "inline-flex h-6 items-center rounded-full bg-surface-2 px-2.5 text-xs";
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(look, "hover:bg-hover hover:text-blue")}
    >
      {label}
    </button>
  ) : (
    <span className={look}>{label}</span>
  );
}

// One part of the details, under a line.
export function Section({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="grid gap-2 border-t border-border-soft px-6 py-4">
      <h3 className="text-[13px] font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export function Row({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  );
}

// The products that use a kit: a small chip each, with its initial.
export function UsedBy({
  products,
  label = true,
}: Readonly<{ products: string[]; label?: boolean }>) {
  const t = useT().market;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && (
        <span className="text-[11px] text-muted-foreground">
          {t.sectionsOf.usedBy}
        </span>
      )}
      {products.map((name) => (
        <span
          key={name}
          className="inline-flex h-6 items-center gap-1.5 rounded-full bg-card/80 py-0 pr-2.5 pl-1 text-xs shadow-soft"
        >
          <span
            aria-hidden
            className="grid size-4 place-items-center rounded-full bg-blue/15 text-[9px] font-semibold text-blue"
          >
            {name.charAt(0)}
          </span>
          {name}
        </span>
      ))}
    </div>
  );
}
