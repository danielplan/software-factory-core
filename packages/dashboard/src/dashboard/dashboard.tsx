import { useEffect, useState } from "react";

import type { State } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { NavRail, type Tab, TABS } from "@/components/nav-rail";
import { StatusLight } from "@/components/status-light";
import { SetupPage } from "@/setup-coach/setup-page";

import { ProductsTab } from "./products-tab";
import { SettingsTab } from "./settings-tab";
import { SystemTab } from "./system-tab";

export type FactoryState = Extract<State, { mode: "factory" }>;

// The tab in the address (#products), so a reload stays on it.
function tabFromHash(): Tab {
  const asked = window.location.hash.slice(1);
  return TABS.find((tab) => tab === asked) ?? "system";
}

function useTab(): Tab {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  useEffect(() => {
    const follow = () => {
      setTab(tabFromHash());
    };
    window.addEventListener("hashchange", follow);
    return () => {
      window.removeEventListener("hashchange", follow);
    };
  }, []);
  return tab;
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
  const tab = useTab();
  return (
    <div className="grid gap-5 max-sm:pt-14 sm:pl-[76px]">
      <NavRail current={tab} status={<Overall state={state} light />} />
      <header className="flex flex-wrap items-baseline justify-between gap-3 px-1">
        <h1 className="text-2xl font-medium tracking-[-0.02em]">
          {state.company.name}
        </h1>
        <span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
          <Overall state={state} />
        </span>
      </header>
      {state.problems.length > 0 && (
        <ProblemBox
          title="Something in the factory's files does not fit"
          text={state.problems.join(" · ")}
        />
      )}
      {tab === "products" && <ProductsTab state={state} />}
      {tab === "settings" && <SettingsTab state={state} />}
      {tab === "system" && <SystemTab state={state} />}
    </div>
  );
}

// The whole factory in a few words, beside its name; only its light (with
// the words to hover) on the rail.
function Overall({
  state,
  light = false,
}: Readonly<{ state: FactoryState; light?: boolean }>) {
  const { lit, words } = overallOf(state);
  if (light)
    return (
      <span title={words} aria-label={words} className="flex">
        <StatusLight light={lit} />
      </span>
    );
  return (
    <>
      <StatusLight light={lit} /> {words}
    </>
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
