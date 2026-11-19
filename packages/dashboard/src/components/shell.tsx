// The frame around every page of the dashboard: the white sidebar, and
// beside it the page on the grey ground, at most 1120px wide, its buttons
// in its own header. An exploration fills the space beside the sidebar.

import type { ReactNode } from "react";

import type { FactoryState } from "@/dashboard/dashboard";
import { useExplorations } from "@/explorations/explorations-page";
import type { Page } from "@/lib/routes";
import {
  countsOf,
  koboldsDoing,
  koboldStatus,
  overallOf,
} from "@/lib/shell-view";
import { useT } from "@/i18n/use-t";
import { SupportBar } from "@/support/support-bar";
import { useSupport } from "@/support/use-support";
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
  const sidebar = useSidebarParts(state);
  return (
    <div className="flex min-h-dvh bg-ground max-md:pt-14 md:pl-56">
      <Sidebar
        name={state.company.name || null}
        current={current}
        {...sidebar}
      />
      <main className="min-w-0 flex-1">
        {fill ? (
          children
        ) : (
          <div
            key={current}
            className="mx-auto grid max-w-[1120px] content-start gap-4 px-4 pt-6 pb-[60px] motion-safe:animate-rise sm:px-10 sm:pt-[34px]"
          >
            {children}
          </div>
        )}
      </main>
      <SupportBar page={current} />
    </div>
  );
}

// What the sidebar shows besides the pages: the counts, the kobold's status
// and light, and what each kobold does now.
function useSidebarParts(state: FactoryState) {
  const t = useT().shell;
  const { data: explorations } = useExplorations();
  const { data: signals } = useSignals();
  const support = useSupport();
  const overall = overallOf(state.parts, t);
  const products = state.parts.filter((part) => part.area === "products");
  const all = [
    ...(explorations?.exploring ?? []),
    ...(explorations?.waiting ?? []),
  ];
  return {
    counts: countsOf(
      explorations?.exploring.length ?? 0,
      state.work,
      signals?.counts.new,
    ),
    kobold: koboldStatus(state.work, state.ideas, overall.words, all, t),
    light: overall.lit,
    product: {
      light: overallOf(products, t).lit,
      link: products.find((part) => part.link)?.link ?? null,
    },
    doing: koboldsDoing(state.work, all, support?.writing != null, t),
  };
}
