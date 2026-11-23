// The factory's frame: the shared frame (components/layout/shell.tsx) with
// the factory's rows in the sidebar, its light on a phone, and Sprocket's
// window. An exploration fills the whole window: its canvas needs the
// room, and its own bar leads back.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { FactoryState } from "@/api/client";
import { teamPagesOf } from "@/lib/screens";
import { useExplorations } from "@/api/use-explorations";
import type { Page } from "@/lib/routes";
import type { ExtensionPage } from "@/lib/page-module";
import { koboldsDoing, koboldStatus, overallOf } from "@/lib/shell-view";

import { FeedbackRow } from "@/features/support/feedback-row";
import { SprocketWindow } from "@/features/support/sprocket-window";
import { useSprocketMoves, useSupport } from "@/features/support/use-support";
import { UpdateRow } from "@/features/updates/update-row";

import { TeamPanel } from "@/components/meet/team-panel";
import { FactoryNav } from "@/components/layout/factory-nav";
import { Shell } from "@/components/layout/shell";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusLight } from "@/components/status-light";

export function FactoryShell({
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
  const { kobold, light, ...rows } = useSidebarParts(state, pages);
  return (
    <>
      <TeamPanel doing={rows.doing} />
      <Shell
        shown={current}
        fill={fill}
        sidebar={
          <Sidebar
            name={state.company.name || null}
            status={
              <span title={kobold.detail} className="ml-auto flex px-3">
                <StatusLight light={light} />
              </span>
            }
          >
            {(onGo) => (
              <FactoryNav
                current={current}
                open={open}
                onGo={onGo}
                {...rows}
                rows={
                  <>
                    <UpdateRow />
                    <FeedbackRow current={current} />
                  </>
                }
              />
            )}
          </Sidebar>
        }
        sprocket={<SprocketWindow page={current} />}
      >
        {children}
      </Shell>
    </>
  );
}

// What the sidebar shows: the installed extensions' pages, each with what
// it counts, the kobold's status and light, and what each kobold does now.
function useSidebarParts(state: FactoryState, pages: ExtensionPage[]) {
  const t = useTranslation().t;
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
