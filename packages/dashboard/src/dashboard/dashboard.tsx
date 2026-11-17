import { useEffect, useState } from "react";

import type { State } from "@/api";
import { trackersOf } from "@/add-ons/trackers";
import { ProblemBox } from "@/components/problem-box";
import { Shell } from "@/components/shell";
import { ConnectPage } from "@/connect/connect-page";
import { ExplorePage } from "@/explore/explore-page";
import { BoardTab } from "@/ideas/board-tab";
import { movedHash, type Page, type Place, placeOf } from "@/lib/routes";
import { PrototypePage } from "@/prototype/prototype-page";
import { SetupPage } from "@/setup-coach/setup-page";
import { UnderstandPage } from "@/understand/understand-page";

import { ChatPage } from "@/chat/chat-page";
import { ChecksPage } from "@/checks/checks-page";
import { SignalsPage } from "@/signals/signals-page";

import { ComingPage, isComing } from "./coming-page";
import { OverviewPage } from "./overview-page";
import { ProductPage } from "@/product/product-page";
import { SettingsTab } from "./settings-tab";

export type FactoryState = Extract<State, { mode: "factory" }>;

// The page in the address, an old address replaced by its new one (so the
// back button does not lead to it again).
function placeFromHash(): Place {
  const moved = movedHash(window.location.hash);
  if (moved) window.history.replaceState(null, "", moved);
  return placeOf(window.location.hash);
}

function usePlace(): Place {
  const [place, setPlace] = useState(placeFromHash);
  useEffect(() => {
    const follow = () => {
      setPlace(placeFromHash());
    };
    window.addEventListener("hashchange", follow);
    return () => {
      window.removeEventListener("hashchange", follow);
    };
  }, []);
  return place;
}

// The dashboard: before there is a company, only the setup page; once there
// is a factory, its pages.
export function Dashboard({ state }: Readonly<{ state: State }>) {
  // Setting up fills the window, with nothing but the coach and the
  // canvas: the pages come once there is a factory.
  if (state.mode === "setup") return <SetupPage state={state} />;
  return <FactoryDashboard state={state} />;
}

function FactoryDashboard({ state }: Readonly<{ state: FactoryState }>) {
  const place = usePlace();
  // Just set up, connecting where work is tracked comes first.
  const { page, open } = state.onboarding
    ? { ...place, page: "connect" as const }
    : place;
  // Prototype mode fills the window, with its own bar.
  if (page === "prototype") return <PrototypePage state={state} open={open} />;
  return (
    <Shell state={state} current={page === "connect" ? "settings" : page}>
      {state.problems.length > 0 && (
        <ProblemBox
          title="Something in the factory's files does not fit"
          text={state.problems.join(" · ")}
        />
      )}
      {page === "connect" && (
        <ConnectPage trackers={trackersOf(state.addOns)} />
      )}
      {page !== "connect" && <PageIn page={page} state={state} open={open} />}
    </Shell>
  );
}

// One page of the dashboard, by its name.
function PageIn({
  page,
  state,
  open,
}: Readonly<{ page: Page; state: FactoryState; open: string | null }>) {
  if (isComing(page)) return <ComingPage page={page} />;
  switch (page) {
    case "today":
      return <OverviewPage state={state} />;
    case "chat":
      return <ChatPage />;
    case "checks":
      return <ChecksPage />;
    case "signals":
      return <SignalsPage open={open} />;
    case "products":
      return <ProductPage state={state} />;
    case "understand":
      return <UnderstandPage open={open} />;
    case "explore":
      return <ExplorePage state={state} open={open} />;
    case "build":
      return <BoardTab state={state} />;
    case "settings":
      return <SettingsTab state={state} />;
  }
}
