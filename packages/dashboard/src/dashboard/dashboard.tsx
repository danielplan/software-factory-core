import { useEffect, useState } from "react";

import type { State } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { NavRail, type Tab, TABS } from "@/components/nav-rail";
import { StatusLight } from "@/components/status-light";
import { ConnectPage } from "@/connect/connect-page";
import { BoardTab } from "@/ideas/board-tab";
import { IdeasTab } from "@/ideas/ideas-tab";
import { SetupPage } from "@/setup-coach/setup-page";

import { SettingsTab } from "./settings-tab";
import { SystemTab } from "./system-tab";

export type FactoryState = Extract<State, { mode: "factory" }>;

// The tab in the address (#settings), and what is open in it
// (#ideas/<id>), so a reload stays there. The board comes first.
type Place = { tab: Tab | "connect"; open: string | null };

function placeFromHash(): Place {
  const [asked, open] = window.location.hash.slice(1).split("/");
  return {
    tab:
      asked === "connect"
        ? "connect"
        : (TABS.find((tab) => tab === asked) ?? "board"),
    open: open ?? null,
  };
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
// is a factory, its tabs.
export function Dashboard({ state }: Readonly<{ state: State }>) {
  // Setting up fills the window, with nothing but the coach and the
  // canvas: the tabs come once there is a factory.
  if (state.mode === "setup") return <SetupPage state={state} />;
  return <FactoryDashboard state={state} />;
}

function FactoryDashboard({ state }: Readonly<{ state: FactoryState }>) {
  const place = usePlace();
  // Just set up, connecting where work is tracked comes first.
  const { tab, open } = state.onboarding
    ? { ...place, tab: "connect" as const }
    : place;
  return (
    <div className="grid gap-5 max-sm:pt-14 sm:pl-[72px]">
      <NavRail
        current={tab === "connect" ? "settings" : tab}
        status={<Overall state={state} />}
      />
      {state.problems.length > 0 && (
        <ProblemBox
          title="Something in the factory's files does not fit"
          text={state.problems.join(" · ")}
        />
      )}
      {tab === "connect" && <ConnectPage trackers={state.trackers} />}
      {tab === "board" && <BoardTab state={state} />}
      {tab === "ideas" && <IdeasTab state={state} open={open} />}
      {tab === "settings" && <SettingsTab state={state} />}
      {tab === "system" && <SystemTab state={state} />}
    </div>
  );
}

// The whole factory's light on the rail, with its words to hover.
function Overall({ state }: Readonly<{ state: FactoryState }>) {
  const { lit, words } = overallOf(state);
  return (
    <span title={words} aria-label={words} className="flex">
      <StatusLight light={lit} />
    </span>
  );
}

function overallOf(state: FactoryState): {
  lit: "problem" | "starting" | "running" | "stopped";
  words: string;
} {
  const parts = state.parts.filter((part) => part.light !== "none");
  const running = parts.filter((part) => part.light === "running").length;
  if (parts.some((part) => part.light === "problem"))
    return { lit: "problem", words: "Something needs you" };
  if (parts.some((part) => part.light === "starting"))
    return { lit: "starting", words: "Starting" };
  if (parts.length > 0 && running === parts.length)
    return { lit: "running", words: "All running" };
  return {
    lit: "stopped",
    words: `${String(running)} of ${String(parts.length)} running`,
  };
}
