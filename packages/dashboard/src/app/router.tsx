import { useEffect, useState } from "react";

import type { FactoryState, State } from "@/api/client";
import { trackersOf } from "@/features/connect/trackers";
import { ProblemBox } from "@/components/layout/problem-box";
import { ConnectPage } from "@/features/connect/connect-page";
import { ExplorationPage } from "@/features/explorations/exploration-page";
import { ExplorationsPage } from "@/features/explorations/explorations-page";
import { MarketPage } from "@/features/marketplace/market-page";
import { TeamPage } from "@/components/screen-view";
import { FactoryPage } from "@/features/factory/factory-page";
import { pagesLeftOut } from "@/lib/market-view";
import { screenOf } from "@/lib/screens";
import { movedHash, type Place, placeOf } from "@/lib/routes";
import { ReleasesPage } from "@/features/releases/releases-page";
import { PersonasPage } from "@/features/personas/personas-page";
import { GuidedSetup } from "@/features/setup/guided-setup";
import { SignalsPage } from "@/features/signals/signals-page";

import { HomePage } from "@/features/home/home-page";
import { SystemPage } from "@/features/system/system-page";
import { useT } from "@/i18n/use-t";

import { featureBlocks } from "./home-blocks";
import { SettingsPage } from "./settings-page";
import { Shell } from "./shell";

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
  // Prototype: the start of setting up, with a made-up folder (?state=).
  if (window.location.hash.startsWith("#setup"))
    return <GuidedSetup state={madeUpSetup(state)} />;
  return <FactoryDashboard state={state} />;
}

// A made-up setup that has not started, for the prototype's start screen.
function madeUpSetup(state: FactoryState): Extract<State, { mode: "setup" }> {
  return {
    mode: "setup",
    project: "/Users/you/projects/bakery-shop-ordering-and-delivery-app",
    kits: state.kits,
    jobs: [],
    coach: {
      messages: [],
      writing: null,
      activity: null,
      working: false,
      started: false,
      problem: null,
      draft: {
        cards: [],
        links: [],
        places: {},
        focus: { ids: [], areas: [], n: 0 },
      },
      phase: "plan",
      made: false,
    },
  };
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
      return <HomePage state={state} featureBlocks={featureBlocks} />;
    case "system":
      return <SystemPage state={state} />;
    case "extensions":
      return <MarketPage state={state} open={open} />;
    case "settings":
      return <SettingsPage state={state} open={open} />;
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
