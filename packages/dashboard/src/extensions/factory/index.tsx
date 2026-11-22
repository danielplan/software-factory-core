// The Factory on the page: its board (#build) with the count of agreed
// work not done yet in the sidebar, and its blocks on Home: the product in
// a line, what waits, the loop and the reviews. Factory is always
// installed, but it is mounted like any other extension.

import { Columns3 } from "lucide-react";

import type { FactoryState } from "@/api/client";
import { PageCount } from "@/components/layout/page-count";
import type { PageModule, PageProps } from "@/lib/page-module";
import { openCardsOf } from "@/lib/shell-view";

import { FactoryPage } from "./factory-page";
import {
  LoopBlock,
  ReviewsBlock,
  StatusBlock,
  WaitingBlock,
} from "./home-blocks";

function Page({ state }: PageProps) {
  return <FactoryPage state={state} />;
}

function Count({ state }: Readonly<{ state: FactoryState }>) {
  return <PageCount n={openCardsOf(state.work)} />;
}

export const factory: PageModule = {
  id: "factory",
  pages: [
    {
      id: "build",
      Page,
      sidebar: {
        group: "work",
        icon: <Columns3 aria-hidden />,
        color: "var(--build)",
        Count,
      },
    },
  ],
  blocks: ({ state, input, waiting }) => ({
    status: <StatusBlock state={state} />,
    waiting: <WaitingBlock waiting={waiting} />,
    loop: <LoopBlock input={input} state={state} />,
    reviews: <ReviewsBlock waiting={waiting} addOns={state.addOns} />,
  }),
};
