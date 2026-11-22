import { useEffect, useState } from "react";

import type { State } from "@/api";
import { trackersOf } from "@/add-ons/trackers";
import { ProblemBox } from "@/components/problem-box";
import { Shell } from "@/components/shell";
import { ConnectPage } from "@/connect/connect-page";
import { ExplorationPage } from "@/explorations/exploration-page";
import { ExplorationsPage } from "@/explorations/explorations-page";
import { MarketPage } from "@/extensions/market-page";
import { TeamPage } from "@/extensions/screen-view";
import { FactoryPage } from "@/factory/factory-page";
import { pagesLeftOut } from "@/lib/market-view";
import { screenOf } from "@/lib/screens";
import { movedHash, type Place, placeOf } from "@/lib/routes";
import { ReleasesPage } from "@/releases/releases-page";
import { PersonasPage } from "@/personas/personas-page";
import { GuidedSetup } from "@/setup-guided/guided-setup";
import { SignalsPage } from "@/signals/signals-page";

import { HomePage } from "./home-page";
import { SettingsTab } from "./settings-tab";
import { SystemPage } from "./system-page";
import { useT } from "@/i18n/use-t";

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

// The page of an extension that is removed is not there: Home shows instead.
function placeShown(
  place: Place,
  left: Place["page"][],
  addOns: FactoryState["addOns"],
): Place {
  const gone =
    left.includes(place.page) ||
    (place.page === "team" &&
      !(place.open && screenOf(addOns, "pages", place.open, true)));
  return gone ? { page: "home", open: null } : place;
}

// The dashboard: before there is a company, only the setup page; once there
// is a factory, its pages.
export function Dashboard({ state }: Readonly<{ state: State }>) {
  // Setting up fills the window, with nothing but the coach and the
  // canvas: the pages come once there is a factory.
  if (state.mode === "setup") return <GuidedSetup state={state} />;
  return <FactoryDashboard state={state} />;
}

function FactoryDashboard({ state }: Readonly<{ state: FactoryState }>) {
  const t = useT();
  const place = usePlace();
  // Just set up, connecting where work is tracked comes first.
  const { page, open } = state.onboarding
    ? { ...place, page: "connect" as const }
    : placeShown(place, pagesLeftOut(state.addOns), state.addOns);
  return (
    <Shell
      state={state}
      current={page === "connect" ? "settings" : page}
      open={open}
      // An exploration fills the whole window.
      fill={page === "explore" && open !== null}
    >
      {state.problems.length > 0 && (
        <ProblemBox title={t.shell.misfit} text={state.problems.join(" · ")} />
      )}
      {page === "team" ? (
        <TeamPageOf state={state} id={open} />
      ) : (
        <PageBody state={state} page={page} open={open} />
      )}
    </Shell>
  );
}

function PageBody({
  state,
  page,
  open,
}: Readonly<{
  state: FactoryState;
  page: Exclude<Place["page"], "team">;
  open: string | null;
}>) {
  switch (page) {
    case "connect":
      return <ConnectPage trackers={trackersOf(state.addOns)} />;
    case "signals":
      return <SignalsPage open={open} app={state.company.name} />;
    case "personas":
      return <PersonasPage open={open} />;
    case "explore":
      return open ? <ExplorationPage id={open} /> : <ExplorationsPage />;
    case "build":
      return <FactoryPage state={state} />;
    case "releases":
      return <ReleasesPage />;
    case "home":
      return <HomePage state={state} />;
    case "system":
      return <SystemPage state={state} />;
    case "extensions":
      return <MarketPage state={state} open={open} />;
    case "settings":
      return <SettingsTab state={state} open={open} />;
  }
}

// A page one of the team's own extensions brings.
function TeamPageOf({
  state,
  id,
}: Readonly<{ state: FactoryState; id: string | null }>) {
  const found = id ? screenOf(state.addOns, "pages", id, true) : undefined;
  return found && <TeamPage view={found.view} by={found.addOn.name} />;
}
