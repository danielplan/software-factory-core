// The frame around every page of the dashboard: one big rounded card
// on a plain colour in contrast with it (on a wide screen), with the sidebar on its
// ground and beside it a white panel with the page in it, which fades in
// when the page changes. A page's own buttons
// (which the page puts there with PageActions) sit in a bar at the top of
// the panel; a page without any has no bar.

import { type ReactNode, useState } from "react";

import type { FactoryState } from "@/dashboard/dashboard";
import { useExploreList } from "@/explore/use-explore";
import type { Page } from "@/lib/routes";
import { countsOf, koboldStatus, overallOf } from "@/lib/shell-view";
import { useKoboldJobs, useOverview } from "@/understand/use-records";

import { ActionsSlot } from "./page-head";
import { Sidebar } from "./sidebar";

export function Shell({
  state,
  current,
  children,
}: Readonly<{ state: FactoryState; current: Page; children: ReactNode }>) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const { data: explore } = useExploreList();
  const jobs = useKoboldJobs();
  const { data: understand } = useOverview();
  const overall = overallOf(state.parts);
  return (
    <div className="min-h-dvh bg-ground max-md:pt-14 md:bg-frame md:p-3">
      <div className="flex min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-1.5rem)] md:rounded-[22px] md:bg-ground md:shadow-float">
        <Sidebar
          current={current}
          counts={countsOf(
            explore?.ideas ?? null,
            state.work,
            understand?.kobold ?? null,
          )}
          kobold={koboldStatus(jobs, state.work, state.ideas, overall.words)}
          trouble={overall.lit === "problem"}
        />
        <main className="m-2 flex min-w-0 flex-1 flex-col rounded-2xl bg-panel shadow-panel md:ml-0">
          <div
            ref={setSlot}
            className="peer flex min-h-[60px] flex-wrap items-center justify-end gap-2 border-b border-border-soft px-4 py-2.5 empty:hidden sm:px-[22px]"
          />
          <ActionsSlot value={slot}>
            <div
              key={current}
              className="grid flex-1 animate-enter content-start gap-4 rounded-b-2xl bg-page px-4 pt-[22px] pb-8 peer-empty:rounded-t-2xl sm:px-[30px]"
            >
              {children}
            </div>
          </ActionsSlot>
        </main>
      </div>
    </div>
  );
}
