// Signals on the page: its page (#signals) with the count of new signals
// in the sidebar, its block on Home, and the live app's card in Settings.
// The app mounts it only while Signals is installed.

import { Inbox } from "lucide-react";

import { useSignals } from "@/api/use-signals";
import { PageCount } from "@/components/layout/page-count";
import type { PageModule, PageProps } from "@/lib/page-module";

import { SignalsBlock } from "./home-block";
import { LiveAppCard } from "./live-app-card";
import { SignalsPage } from "./signals-page";

function Page({ state, open }: PageProps) {
  return <SignalsPage open={open} app={state.company.name} />;
}

// The new signals: something waiting for you, so a badge.
function Count() {
  const { data } = useSignals();
  return <PageCount n={data?.counts.new ?? 0} badge />;
}

export const signals: PageModule = {
  id: "signals",
  pages: [
    {
      id: "signals",
      Page,
      sidebar: {
        group: "work",
        icon: <Inbox aria-hidden />,
        color: "var(--understand)",
        Count,
      },
    },
  ],
  blocks: ({ state, input }) => ({
    signals: <SignalsBlock input={input} addOns={state.addOns} />,
  }),
  settings: (t) => [
    {
      name: t.settings.sections.liveApp,
      tab: "Connections",
      body: <LiveAppCard />,
    },
  ],
};
