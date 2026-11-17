// The top of every page: its title (32px) and, beside it, what the page
// adds there (a page's own tabs); one line about the page under it; and the
// page's own buttons on the right.

import type { ReactNode } from "react";

export function PageHead({
  title,
  about,
  actions,
  children,
}: Readonly<{
  title: string;
  about?: ReactNode;
  actions?: ReactNode;
  // Beside the title, such as a page's own tabs.
  children?: ReactNode;
}>) {
  return (
    <header className="mb-1.5 grid gap-1.5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h1 className="text-[32px] leading-[1.15] font-bold tracking-[-0.025em]">
            {title}
          </h1>
          {children}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
        )}
      </div>
      {about && <p className="text-sm text-muted-foreground">{about}</p>}
    </header>
  );
}
