import type { ReactNode } from "react";

// One step: its number, title and what it says now, and what to do.
export function Step({
  n,
  title,
  done,
  children,
}: Readonly<{ n: number; title: string; done: boolean; children: ReactNode }>) {
  return (
    <li className="flex gap-3">
      <span
        className={
          done
            ? "flex size-7 flex-none items-center justify-center rounded-full bg-success/15 text-xs font-semibold text-success"
            : "flex size-7 flex-none items-center justify-center rounded-full bg-surface-2 text-xs font-semibold"
        }
      >
        {done ? "✓" : String(n)}
      </span>
      <div className="grid min-w-0 flex-1 gap-2 pt-0.5">
        <span className="text-[15px] font-medium">{title}</span>
        {children}
      </div>
    </li>
  );
}
