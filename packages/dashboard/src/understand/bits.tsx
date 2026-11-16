// Small pieces the Understand pages share: a story's pill, its scenes as
// squares (seen or guessed), the kobold's mark, a persona's initial, the
// header with its breadcrumb, and a plain choice list.

import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { type Tone } from "./view";

const TONES: Record<Tone, string> = {
  open: "bg-fresh/12 text-fresh",
  solving: "bg-warning/20 text-foreground",
  solved: "bg-success/15 text-foreground",
  wrong: "bg-surface-2 text-muted-foreground",
  none: "bg-surface-2 text-muted-foreground",
};

export function Pill({
  tone,
  children,
}: Readonly<{ tone: Tone; children: ReactNode }>) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

// One square per scene: filled when seen, light when guessed.
export function Squares({ seen }: Readonly<{ seen: boolean[] }>) {
  const known = seen.filter(Boolean).length;
  return (
    <span
      className="flex gap-[3px]"
      role="img"
      aria-label={`${String(known)} of ${String(seen.length)} scenes seen`}
    >
      {seen.map((one, at) => (
        <span
          // The scenes keep their order; nothing is added in between.
          key={at}
          className={cn(
            "size-2.5 rounded-[3px]",
            one ? "bg-success" : "bg-surface-2",
          )}
        />
      ))}
    </span>
  );
}

export function KoboldMark({ className }: Readonly<{ className?: string }>) {
  return (
    <span
      className={cn(
        "grid size-7 flex-none place-items-center rounded-full bg-[var(--tint)] text-primary",
        className,
      )}
      aria-hidden
    >
      <Sparkles className="size-3.5" />
    </span>
  );
}

export function Initial({
  name,
  tint,
  big = false,
}: Readonly<{ name: string; tint: string; big?: boolean }>) {
  return (
    <span
      className={cn(
        "grid flex-none place-items-center rounded-full font-semibold",
        big ? "size-16 text-2xl" : "size-9 text-sm",
        tint,
      )}
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export type Crumb = { name: string; href?: string };

// The page's breadcrumb (Understand › Persona › Story), its title and what
// it is, and its buttons.
export function PageHead({
  crumbs,
  title,
  about,
  actions,
}: Readonly<{
  crumbs: Crumb[];
  title: string;
  about: string;
  actions?: ReactNode;
}>) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3 px-1 pt-1">
      <div className="grid flex-1 gap-1">
        {crumbs.length > 1 && (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[13px]"
          >
            {crumbs.map((crumb, at) => (
              <span key={crumb.name} className="flex items-center gap-1.5">
                {at > 0 && <span className="text-muted-foreground">›</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {crumb.name}
                  </a>
                ) : (
                  <span aria-current="page" className="font-medium">
                    {crumb.name}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{about}</p>
      </div>
      {actions}
    </header>
  );
}

// A small label above a part of a card.
export function Label({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="text-xs text-muted-foreground">{children}</span>;
}
