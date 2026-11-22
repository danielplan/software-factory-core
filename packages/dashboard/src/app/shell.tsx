// The frame around every page of the dashboard: the white sidebar, and
// beside it the page on the grey ground, at most 1120px wide, its buttons
// in its own header. An exploration fills the whole window: its canvas
// needs the room, and its own bar leads back.

import type { ReactNode } from "react";

import type { FactoryState } from "@/api/client";
import { teamPagesOf } from "@/lib/screens";
import { useExplorations } from "@/api/use-explorations";
import type { Page } from "@/lib/routes";
import type { ExtensionPage } from "@/lib/page-module";
import { koboldsDoing, koboldStatus, overallOf } from "@/lib/shell-view";
import { useT } from "@/i18n/use-t";
import { FeedbackRow } from "@/features/support/feedback-row";
import { SprocketWindow } from "@/features/support/sprocket-window";
import { useSprocketMoves, useSupport } from "@/features/support/use-support";
import { UpdateRow } from "@/features/updates/update-row";

import { Sidebar } from "@/components/layout/sidebar";

export function Shell({
  state,
  pages,
  current,
  open = null,
  fill = false,
  children,
}: Readonly<{
  state: FactoryState;
  // The pages of the installed extensions, for the sidebar.
  pages: ExtensionPage[];
  current: Page;
  // What is open in the page: for a team's page, which one.
  open?: string | null;
  fill?: boolean;
  children: ReactNode;
}>) {
  const sidebar = useSidebarParts(state, pages);
  if (fill)
    return <main className="min-h-dvh min-w-0 bg-ground">{children}</main>;
  return (
    <div className="flex min-h-dvh bg-ground max-md:pt-14 md:pl-56">
      <Sidebar
        name={state.company.name || null}
        current={current}
        open={open}
        {...sidebar}
        rows={
          <>
            <UpdateRow />
            <FeedbackRow current={current} />
          </>
        }
      />
      <main className="min-w-0 flex-1">
        <div
          key={current}
          className="mx-auto grid max-w-[1120px] content-start gap-4 px-4 pt-6 pb-28 motion-safe:animate-rise sm:px-10 sm:pt-[34px]"
        >
          {children}
        </div>
      </main>
      <SprocketWindow page={current} />
    </div>
  );
}

// What the sidebar shows: the installed extensions' pages, each with what
// it counts, the kobold's status and light, and what each kobold does now.
function useSidebarParts(state: FactoryState, pages: ExtensionPage[]) {
  const t = useT().shell;
  const exploring = pages.some((page) => page.id === "explore");
  const { data: explorations } = useExplorations(exploring);
  const support = useSupport();
  useSprocketMoves();
  const overall = overallOf(state.parts, t);
  const products = state.parts.filter((part) => part.area === "products");
  const all = [
    ...(explorations?.exploring ?? []),
    ...(explorations?.waiting ?? []),
  ];
  return {
    pages: pages.map(({ id, sidebar: { Count, ...row } }) => ({
      page: id,
      ...row,
      count: Count && <Count state={state} />,
    })),
    kobold: koboldStatus(state.work, state.ideas, overall.words, all, t),
    light: overall.lit,
    team: teamPagesOf(state.addOns),
    product: {
      light: overallOf(products, t).lit,
      link: products.find((part) => part.link)?.link ?? null,
    },
    doing: koboldsDoing(state.work, all, support?.writing != null, t),
  };
}
