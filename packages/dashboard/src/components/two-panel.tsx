import type { ReactNode } from "react";

import { LogoTile } from "./logo";

// The big white card: on the left, on a soft glow, the mark and what this
// is about; on the right, on a light grey, its content.
export function TwoPanel({
  left,
  children,
}: Readonly<{ left: ReactNode; children: ReactNode }>) {
  return (
    <div className="mx-auto flex w-full max-w-[1040px] flex-wrap rounded-[28px] bg-card p-2.5 shadow-big">
      <div className="glow-panel flex min-h-[260px] min-w-0 flex-[1_1_320px] flex-col gap-[18px] rounded-[20px] p-8 sm:min-h-[480px] sm:p-10">
        <LogoTile />
        <div className="mt-auto flex flex-col gap-3.5">{left}</div>
      </div>
      <div className="flex min-w-0 flex-[1.4_1_420px] flex-col gap-6 rounded-[20px] bg-surface p-6 sm:p-10 lg:rounded-l-none">
        {children}
      </div>
    </div>
  );
}
