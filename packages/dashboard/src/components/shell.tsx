// The frame around every page of the dashboard: the white sidebar, and
// beside it the page on the grey ground. Kobble's pages (Signals,
// Personas) sit right on the ground with their buttons in their own
// header; the older pages keep their white panel with a bar at its top
// (Ask the kobold, and the page's own buttons, which the page puts there
// with PageActions).

import { type ReactNode, useState } from "react";

import type { FactoryState } from "@/dashboard/dashboard";
import { useExploreList } from "@/explore/use-explore";
import { ON_THE_GROUND, type Page } from "@/lib/routes";
import { countsOf, koboldStatus, overallOf } from "@/lib/shell-view";
import { useSignals } from "@/signals/use-signals";
import { useKoboldJobs } from "@/understand/use-records";

import { AskKobold } from "./ask-kobold";
import { ActionsSlot } from "./page-head";
import { Sidebar } from "./sidebar";

export function Shell({
  state,
  current,
  children,
}: Readonly<{ state: FactoryState; current: Page; children: ReactNode }>) {
  const { data: explore } = useExploreList();
  const { data: signals } = useSignals();
  const jobs = useKoboldJobs();
  // A factory works on one repository: the Ask field speaks of its first
  // product, with no choice in the sidebar.
  const product = state.products[0]?.name;
  const overall = overallOf(state.parts);
  return (
    <div className="flex min-h-dvh bg-ground max-md:pt-14 md:pl-64">
      <Sidebar
        current={current}
        counts={countsOf(
          explore?.ideas ?? null,
          state.work,
          signals?.counts.new,
        )}
        kobold={koboldStatus(jobs, state.work, state.ideas, overall.words)}
        light={overall.lit}
      />
      {ON_THE_GROUND.has(current) ? (
        <main className="min-w-0 flex-1">
          <div className="mx-auto grid max-w-[1120px] content-start gap-4 px-4 pt-6 pb-[60px] sm:px-10 sm:pt-[34px]">
            {children}
          </div>
        </main>
      ) : (
        <Panel product={product}>{children}</Panel>
      )}
    </div>
  );
}

// The older pages' white panel, with Ask the kobold and the page's buttons
// at its top.
function Panel({
  product,
  children,
}: Readonly<{ product: string | undefined; children: ReactNode }>) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return (
    <main className="m-2 flex min-w-0 flex-1 flex-col rounded-2xl bg-panel shadow-panel">
      <div className="flex min-h-[60px] flex-wrap items-center gap-2.5 border-b border-border-soft px-4 py-2.5 sm:px-[22px]">
        <AskKobold product={product} />
        <div
          ref={setSlot}
          className="ml-auto flex flex-wrap items-center gap-2 empty:hidden"
        />
      </div>
      <ActionsSlot value={slot}>
        <div className="grid flex-1 content-start gap-4 rounded-b-2xl bg-page px-4 pt-[22px] pb-8 sm:px-[30px]">
          {children}
        </div>
      </ActionsSlot>
    </main>
  );
}
