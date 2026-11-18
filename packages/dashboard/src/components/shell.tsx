// The frame around every page of the dashboard: the white sidebar, and
// beside it the page on the grey ground, at most 1120px wide, its buttons
// in its own header. An exploration fills the space beside the sidebar.

import type { ReactNode } from "react";

import type { FactoryState } from "@/dashboard/dashboard";
import { useExplorations } from "@/explorations/explorations-page";
import type { Page } from "@/lib/routes";
import { countsOf, koboldStatus, overallOf } from "@/lib/shell-view";
import { useSignals } from "@/signals/use-signals";

import { Sidebar } from "./sidebar";

export function Shell({
  state,
  current,
  fill = false,
  children,
}: Readonly<{
  state: FactoryState;
  current: Page;
  fill?: boolean;
  children: ReactNode;
}>) {
  const { data: explorations } = useExplorations();
  const { data: signals } = useSignals();
  const overall = overallOf(state.parts);
  return (
    <div className="flex min-h-dvh bg-ground max-md:pt-14 md:pl-64">
      <Sidebar
        current={current}
        counts={countsOf(
          explorations?.exploring.length ?? 0,
          state.work,
          signals?.counts.new,
        )}
        kobold={koboldStatus(state.work, state.ideas, overall.words, [
          ...(explorations?.exploring ?? []),
          ...(explorations?.waiting ?? []),
        ])}
        light={overall.lit}
      />
      <main className="min-w-0 flex-1">
        {fill ? (
          children
        ) : (
          <div className="mx-auto grid max-w-[1120px] content-start gap-4 px-4 pt-6 pb-[60px] sm:px-10 sm:pt-[34px]">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
