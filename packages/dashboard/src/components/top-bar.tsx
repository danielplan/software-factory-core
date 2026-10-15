import type { ReactNode } from "react";

import { LogoTile } from "./logo";

// The white bar along the top: the mark and the company's name, the tabs in
// the middle, and a status at the right.
export function TopBar({
  company,
  tabs,
  status,
}: Readonly<{ company: string; tabs?: ReactNode; status?: ReactNode }>) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-card py-2.5 pr-2.5 pl-5">
      <div className="flex items-center gap-3 font-medium">
        <LogoTile small />
        <span className="truncate">{company}</span>
      </div>
      {tabs}
      {status && (
        <span className="inline-flex items-center gap-2 pr-2.5 text-[13px] text-muted-foreground">
          {status}
        </span>
      )}
    </header>
  );
}
