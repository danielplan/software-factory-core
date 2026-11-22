// One card of the Marketplace: a colored icon tile, the name and one line.
// What is in turns green with a check; the team's own say so. A click opens
// the details; what to press (Install, Switch to…) sits at the foot.

import { Check, Users } from "lucide-react";
import type { ReactNode } from "react";

import { IconTile } from "@/add-ons/looks";
import { useT } from "@/i18n/use-t";
import type { Thing } from "@/lib/market-view";
import { cn } from "@/lib/utils";

import { UsedBy } from "./chips";

export function Card({
  thing,
  onOpen,
  action,
  fresh = false,
  leaving = false,
}: Readonly<{
  thing: Thing;
  onOpen: () => void;
  // What to press; nothing once it is in.
  action: ReactNode;
  // Just installed: it turns green and its check pops in.
  fresh?: boolean;
  // Being removed: it fades out.
  leaving?: boolean;
}>) {
  const t = useT().market;
  const inside = thing.state !== null;
  const products = thing.usedBy?.kind === "products" ? thing.usedBy.names : [];
  return (
    <article
      aria-label={thing.name}
      data-flip={thing.key}
      className={cn(
        "relative grid content-between gap-3.5 rounded-xl p-4 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        fresh ? "m-tint" : "m-rise",
        leaving && "m-leave",
        inside
          ? "bg-success/[0.07] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--success)_22%,transparent)]"
          : "bg-card shadow-soft",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={t.open(thing.name)}
        className="absolute inset-0 rounded-xl"
      />
      <div className="grid gap-3">
        <div className="flex items-center gap-3">
          <IconTile id={thing.look} />
          <div className="grid min-w-0 gap-1">
            <span className="truncate font-semibold">{thing.name}</span>
            {thing.maker === "team" && <MadeByTeam />}
          </div>
          {thing.state !== null && (
            <Badge thing={thing} state={thing.state} fresh={fresh} />
          )}
        </div>
        <p className="text-[13px] text-foreground/75">{thing.about}</p>
      </div>
      <Foot products={products} action={action} />
    </article>
  );
}

// What it is in: a check (and, for a connection, "In use") in green.
function Badge({
  thing,
  state,
  fresh,
}: Readonly<{
  thing: Thing;
  state: NonNullable<Thing["state"]>;
  fresh: boolean;
}>) {
  const t = useT().market;
  const label = t.states[state];
  return (
    <span
      data-flip={
        state === "inUse"
          ? `in-use-${thing.key.slice(0, thing.key.indexOf(":"))}`
          : undefined
      }
      className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-success"
    >
      {state === "inUse" && label}
      <span
        role="img"
        aria-label={label}
        className={cn(
          "grid size-5 flex-none place-items-center rounded-full bg-success text-white",
          fresh && "m-pop",
        )}
      >
        <Check aria-hidden className="size-3" strokeWidth={3} />
      </span>
    </span>
  );
}

// The team's own: made by them, with the people icon.
function MadeByTeam() {
  const t = useT().market;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Users aria-hidden className="size-3" />
      {t.madeByTeam}
    </span>
  );
}

// At the foot: the products that use a kit, and what to press.
function Foot({
  products,
  action,
}: Readonly<{ products: string[]; action: ReactNode }>) {
  if (!action && products.length === 0) return null;
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-2">
      {products.length > 0 ? <UsedBy products={products} /> : <span />}
      {action}
    </div>
  );
}
