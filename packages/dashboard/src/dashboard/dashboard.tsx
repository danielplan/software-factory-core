import { useEffect, useState } from "react";

import type { State } from "@/api";
import { trackersOf } from "@/add-ons/trackers";
import { ProblemBox } from "@/components/problem-box";
import { Shell } from "@/components/shell";
import { ConnectPage } from "@/connect/connect-page";
import { ExplorePage } from "@/explore/explore-page";
import { BoardTab } from "@/ideas/board-tab";
import { movedHash, type Place, placeOf } from "@/lib/routes";
import { PrototypePage } from "@/prototype/prototype-page";
import { SetupPage } from "@/setup-coach/setup-page";
import { UnderstandPage } from "@/understand/understand-page";

import { ComingPage, isComing } from "./coming-page";
import { SettingsTab } from "./settings-tab";
import { WorkshopPage } from "./workshop-page";

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
      {isComing(page) && <ComingPage page={page} />}
      {page === "understand" && <UnderstandPage open={open} />}
      {page === "explore" && <ExplorePage state={state} open={open} />}
      {page === "build" && <BoardTab state={state} />}
      {page === "workshop" && <WorkshopPage state={state} open={open} />}
      {page === "settings" && <SettingsTab state={state} />}
    </Shell>
  );
}
