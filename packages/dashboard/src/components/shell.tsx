// The frame around every page of the dashboard: the sidebar on the ground,
// and beside it a white panel with a bar at its top (Ask the kobold, and
// the page's own buttons, which the page puts there with PageActions) over
// the page itself.

import { type ReactNode, useState } from "react";

import type { FactoryState } from "@/dashboard/dashboard";
import { useExploreList } from "@/explore/use-explore";
import type { Page } from "@/lib/routes";
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
  const [picked, choose] = useState<string | null>(null);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const { data: explore } = useExploreList();
  const { data: signals } = useSignals();
  const jobs = useKoboldJobs();
  const { products } = state;
  // The one picked, while it is still there; the first one otherwise.
  const chosen =
    products.find((one) => one.id === picked) ?? products[0] ?? null;
  const overall = overallOf(state.parts);
  return (
    <div className="flex min-h-dvh bg-ground max-md:pt-14 md:pl-[232px]">
      <Sidebar
        current={current}
        company={state.company.name}
        products={products}
        chosen={chosen?.id ?? ""}
        onChoose={choose}
        counts={countsOf(
          explore?.ideas ?? null,
          state.work,
          signals?.counts.new,
        )}
        kobold={koboldStatus(jobs, state.work, state.ideas, overall.words)}
        light={overall.lit}
      />
      <main className="m-2 flex min-w-0 flex-1 flex-col rounded-2xl bg-panel shadow-panel md:ml-0">
        <div className="flex min-h-[60px] flex-wrap items-center gap-2.5 border-b border-border-soft px-4 py-2.5 sm:px-[22px]">
          <AskKobold product={chosen?.name} />
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
    </div>
  );
}
