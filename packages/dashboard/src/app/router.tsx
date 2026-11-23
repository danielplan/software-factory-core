// The pages by address, with React Router on the address after the #
// (#explore/X-1): the core's pages, the pages of the installed extensions
// and of the team's own, and the old addresses, which lead to where their
// page is now. An address no page has, or the page of an extension that is
// removed, shows Home.

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router";

import type { FactoryState, State } from "@/api/client";
import { ProblemBox } from "@/components/layout/problem-box";
import { TeamPage } from "@/components/screen-view";
import { ConnectPage } from "@/features/connect/connect-page";
import { trackersOf } from "@/features/connect/trackers";
import { HomePage } from "@/features/home/home-page";
import { MarketPage } from "@/features/marketplace/market-page";
import { GuidedSetup } from "@/features/setup/guided-setup";
import { SystemPage } from "@/features/system/system-page";
import type { ExtensionPage } from "@/lib/page-module";
import { MOVED, movedHash, placeOf, placeShown } from "@/lib/routes";
import { screenOf } from "@/lib/screens";

import { blocksOf, pagesOf } from "./extensions";
import { SettingsPage } from "./settings-page";
import { FactoryShell } from "./factory-shell";

// The dashboard: before there is a company, only the setup page; once there
// is a factory, its pages.
export function Dashboard({ state }: Readonly<{ state: State }>) {
  // Setting up sits in the same frame as the factory's pages, its steps
  // in the sidebar: the pages come once there is a factory.
  if (state.mode === "setup") return <GuidedSetup state={state} />;
  return <FactoryDashboard state={state} />;
}

function FactoryDashboard({ state }: Readonly<{ state: FactoryState }>) {
  const pages = pagesOf(state);
  const home = <HomePage state={state} featureBlocks={blocksOf(state)} />;
  const connect = <ConnectPage trackers={trackersOf(state.addOns)} />;
  // Just set up, connecting where work is tracked comes first.
  if (state.onboarding)
    return (
      <Frame state={state} pages={pages} onboarding>
        {connect}
      </Frame>
    );
  return (
    <Routes>
      {[...MOVED.keys()].map((old) => (
        <Route key={old} path={`${old}/*`} element={<Moved />} />
      ))}
      <Route element={<Frame state={state} pages={pages} />}>
        <Route index element={home} />
        <Route path="home" element={home} />
        <Route path="system" element={<SystemPage state={state} />} />
        <Route
          path="extensions/*"
          element={
            <WithOpen
              show={(open) => <MarketPage state={state} open={open} />}
            />
          }
        />
        <Route
          path="settings/*"
          element={
            <WithOpen
              show={(open) => <SettingsPage state={state} open={open} />}
            />
          }
        />
        <Route path="connect/*" element={connect} />
        <Route
          path="team/:id"
          element={<TeamPageOf state={state} home={home} />}
        />
        {pages.map((page) => (
          <Route
            key={page.id}
            path={`${page.id}/*`}
            element={
              <WithOpen
                show={(open) => <page.Page state={state} open={open} />}
              />
            }
          />
        ))}
        <Route path="*" element={home} />
      </Route>
    </Routes>
  );
}

// The frame around the page: the sidebar lit at the page shown, a line when
// the factory's files do not fit, and the page.
function Frame({
  state,
  pages,
  onboarding = false,
  children,
}: Readonly<{
  state: FactoryState;
  pages: ExtensionPage[];
  onboarding?: boolean;
  children?: ReactNode;
}>) {
  const t = useTranslation().t;
  const { pathname } = useLocation();
  const place = onboarding
    ? { page: "connect" as const, open: null }
    : placeShown(placeOf(pathname), pages, state.addOns);
  const extension = pages.find((one) => one.id === place.page);
  return (
    <FactoryShell
      state={state}
      pages={pages}
      current={place.page === "connect" ? "settings" : place.page}
      open={place.open}
      fill={extension?.fills?.(place.open) ?? false}
    >
      {state.problems.length > 0 && (
        <ProblemBox
          title={t("shell.misfit")}
          text={state.problems.join(" · ")}
        />
      )}
      {children ?? <Outlet />}
    </FactoryShell>
  );
}

// A page with what is open in it: the rest of the address after the page
// (#personas/mia/tests: "mia/tests"), or nothing.
function WithOpen({
  show,
}: Readonly<{ show: (open: string | null) => ReactNode }>) {
  const rest = useParams()["*"];
  return show(rest || null);
}

// An old address, replaced by its new one, so the back button does not lead
// to it again.
function Moved() {
  const { pathname } = useLocation();
  const now = movedHash(pathname.slice(1)) ?? "#home";
  return <Navigate replace to={`/${now.slice(1)}`} />;
}

// A page one of the team's own extensions brings; Home when that
// extension is not installed.
function TeamPageOf({
  state,
  home,
}: Readonly<{ state: FactoryState; home: ReactNode }>) {
  const { id = "" } = useParams();
  const found = screenOf(state.addOns, "pages", id, true);
  return found ? <TeamPage view={found.view} by={found.addOn.name} /> : home;
}
