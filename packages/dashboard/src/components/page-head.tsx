// The top of every page: an optional breadcrumb (Understand › Persona ›
// Story), its title and what it is about. A page's own buttons go in the
// bar at the top of the panel, beside Ask the kobold (PageActions puts them
// there wherever the page draws them).

import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

export type Crumb = { name: string; href?: string };

const Slot = createContext<HTMLElement | null>(null);

// The place in the top bar where the page's buttons go (the shell gives
// it).
export const ActionsSlot = Slot.Provider;

// The page's buttons, shown in the top bar.
export function PageActions({ children }: Readonly<{ children: ReactNode }>) {
  const slot = useContext(Slot);
  return slot ? createPortal(children, slot) : null;
}

export function PageHead({
  crumbs = [],
  title,
  about,
  actions,
  children,
}: Readonly<{
  crumbs?: Crumb[];
  title: string;
  about?: ReactNode;
  actions?: ReactNode;
  // Beside the title, such as a page's own tabs.
  children?: ReactNode;
}>) {
  return (
    <header className="grid gap-1.5 pt-1.5">
      {crumbs.length > 1 && <Breadcrumb crumbs={crumbs} />}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
          {title}
        </h1>
        {children}
      </div>
      {about && <p className="text-sm text-muted-foreground">{about}</p>}
      {actions && <PageActions>{actions}</PageActions>}
    </header>
  );
}

function Breadcrumb({ crumbs }: Readonly<{ crumbs: Crumb[] }>) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-[13px]"
    >
      {crumbs.map((crumb, at) => (
        <span key={crumb.name} className="flex items-center gap-1.5">
          {at > 0 && <span className="text-label">›</span>}
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
  );
}
