import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import type { FactoryState, State } from "@/api/client";
import type { ExtensionPage } from "@/lib/page-module";
import { trackersOf } from "@/features/connect/trackers";
import { ProblemBox } from "@/components/layout/problem-box";
import { ConnectPage } from "@/features/connect/connect-page";
import { MarketPage } from "@/features/marketplace/market-page";
import { TeamPage } from "@/components/screen-view";
import { screenOf } from "@/lib/screens";
import { movedHash, type Place, placeOf } from "@/lib/routes";
import { GuidedSetup } from "@/features/setup/guided-setup";

import { HomePage } from "@/features/home/home-page";
import { SystemPage } from "@/features/system/system-page";

import { blocksOf, pagesOf } from "./extensions";
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

// The pages of the core, always there; an extension's are there only while
// it is installed.
const CORE_PAGES = new Set<Place["page"]>([
  "home",
  "system",
  "extensions",
  "settings",
  "connect",
]);

// The page of an extension that is removed is not there: Home shows instead.
function placeShown(
  place: Place,
  pages: ExtensionPage[],
  addOns: FactoryState["addOns"],
): Place {
  const there =
    CORE_PAGES.has(place.page) ||
    pages.some((page) => page.id === place.page) ||
    (place.page === "team" &&
      place.open !== null &&
      screenOf(addOns, "pages", place.open, true) !== undefined);
  return there ? place : { page: "home", open: null };
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
  const t = useTranslation().t;
  const place = usePlace();
  const pages = pagesOf(state);
  // Just set up, connecting where work is tracked comes first.
  const { page, open } = state.onboarding
    ? { ...place, page: "connect" as const }
    : placeShown(place, pages, state.addOns);
  const extension = pages.find((one) => one.id === page);
  return (
    <Shell
      state={state}
      pages={pages}
      current={page === "connect" ? "settings" : page}
      open={open}
      fill={extension?.fills?.(open) ?? false}
    >
      {state.problems.length > 0 && (
        <ProblemBox
          title={t("shell.misfit")}
          text={state.problems.join(" · ")}
        />
      )}
      <PageBody state={state} page={page} open={open} extension={extension} />
    </Shell>
  );
}

// The page shown: an installed extension's, a team's own, or the core's.
function PageBody({
  state,
  page,
  open,
  extension,
}: Readonly<{
  state: FactoryState;
  page: Place["page"];
  open: string | null;
  extension: ExtensionPage | undefined;
}>) {
  if (extension) return <extension.Page state={state} open={open} />;
  switch (page) {
    case "team":
      return <TeamPageOf state={state} id={open} />;
    case "connect":
      return <ConnectPage trackers={trackersOf(state.addOns)} />;
    case "system":
      return <SystemPage state={state} />;
    case "extensions":
      return <MarketPage state={state} open={open} />;
    case "settings":
      return <SettingsPage state={state} open={open} />;
    default:
      return <HomePage state={state} featureBlocks={blocksOf(state)} />;
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
