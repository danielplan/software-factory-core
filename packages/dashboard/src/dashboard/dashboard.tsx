import { useEffect, useState } from "react";

import type { State } from "@/api";
import { trackersOf } from "@/add-ons/trackers";
import { ProblemBox } from "@/components/problem-box";
import { Shell } from "@/components/shell";
import { ConnectPage } from "@/connect/connect-page";
import { ExplorationPage } from "@/explorations/exploration-page";
import { ExplorationsPage } from "@/explorations/explorations-page";
import { FactoryPage } from "@/factory/factory-page";
import { movedHash, type Place, placeOf } from "@/lib/routes";
import { PersonasPage } from "@/personas/personas-page";
import { SetupPage } from "@/setup-coach/setup-page";
import { SignalsPage } from "@/signals/signals-page";

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
  return (
    <Shell
      state={state}
      current={page === "connect" ? "settings" : page}
      // An exploration fills the space beside the sidebar.
      fill={page === "explore" && open !== null}
    >
      {state.problems.length > 0 && (
        <ProblemBox
          title="Something in the factory's files does not fit"
          text={state.problems.join(" · ")}
        />
      )}
      <PageBody state={state} page={page} open={open} />
    </Shell>
  );
}

function PageBody({
  state,
  page,
  open,
}: Readonly<{
  state: FactoryState;
  page: Place["page"];
  open: string | null;
}>) {
  switch (page) {
    case "connect":
      return <ConnectPage trackers={trackersOf(state.addOns)} />;
    case "signals":
      return <SignalsPage open={open} />;
    case "personas":
      return <PersonasPage open={open} />;
    case "explore":
      return open ? <ExplorationPage id={open} /> : <ExplorationsPage />;
    case "build":
      return <FactoryPage state={state} />;
    case "workshop":
      return <WorkshopPage state={state} open={open} />;
    case "settings":
      return <SettingsTab state={state} />;
  }
}
