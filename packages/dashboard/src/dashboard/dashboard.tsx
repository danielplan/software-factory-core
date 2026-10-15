import { useEffect, useState } from "react";

import type { State } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { StatusLight } from "@/components/status-light";
import { TopBar } from "@/components/top-bar";
import { cn } from "@/lib/utils";

import { CreateCompany } from "./create-company";
import { ProductsTab } from "./products-tab";
import { SettingsTab } from "./settings-tab";
import { SystemTab } from "./system-tab";

export type FactoryState = Extract<State, { mode: "factory" }>;

const TABS = ["system", "products", "settings"] as const;
type Tab = (typeof TABS)[number];
const NAMES: Record<Tab, string> = {
  system: "System",
  products: "Products",
  settings: "Settings",
};

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

// The dashboard, always: before there is a company, the System tab asks for
// one and the other tabs wait for it.
export function Dashboard({ state }: Readonly<{ state: State }>) {
  const tab = useTab();
  const factory = state.mode === "factory" ? state : null;
  return (
    <div className="grid gap-5">
      <TopBar
        company={factory?.company.name ?? ""}
        tabs={<Tabs current={tab} />}
        status={factory && <Overall state={factory} />}
      />
      {factory && factory.problems.length > 0 && (
        <ProblemBox
          title="Something in the factory's files does not fit"
          text={factory.problems.join(" · ")}
        />
      )}
      <TabContent state={state} tab={tab} />
    </div>
  );
}

function TabContent({ state, tab }: Readonly<{ state: State; tab: Tab }>) {
  if (state.mode === "setup")
    return tab === "system" ? (
      <CreateCompany factoriesFolder={state.factoriesFolder} />
    ) : (
      <CreateFirst />
    );
  if (tab === "products") return <ProductsTab state={state} />;
  if (tab === "settings") return <SettingsTab state={state} />;
  return <SystemTab state={state} />;
}

function CreateFirst() {
  return (
    <div className="rounded-3xl bg-card p-6 text-muted-foreground">
      First give the factory your company's name on the{" "}
      <a
        href="#system"
        className="text-foreground underline underline-offset-2"
      >
        System
      </a>{" "}
      tab.
    </div>
  );
}

function Tabs({ current }: Readonly<{ current: Tab }>) {
  return (
    <nav
      className="flex flex-wrap gap-1 rounded-[14px] bg-surface-2 p-1"
      aria-label="Tabs"
    >
      {TABS.map((name) => (
        <a
          key={name}
          href={`#${name}`}
          aria-current={current === name ? "page" : undefined}
          className={cn(
            "inline-flex min-h-10 items-center rounded-[10px] px-4 text-sm text-muted-foreground hover:text-foreground",
            current === name && "bg-card text-foreground shadow-soft",
          )}
        >
          {NAMES[name]}
        </a>
      ))}
    </nav>
  );
}

// The whole factory in a few words, at the right of the top bar.
function Overall({ state }: Readonly<{ state: FactoryState }>) {
  const parts = state.parts.filter((part) => part.light !== "none");
  const running = parts.filter((part) => part.light === "running").length;
  if (parts.some((part) => part.light === "problem"))
    return (
      <>
        <StatusLight light="problem" /> Something needs you
      </>
    );
  if (parts.some((part) => part.light === "starting"))
    return (
      <>
        <StatusLight light="starting" /> Starting
      </>
    );
  if (parts.length > 0 && running === parts.length)
    return (
      <>
        <StatusLight light="running" /> All running
      </>
    );
  return (
    <>
      <StatusLight light="stopped" /> {running} of {parts.length} running
    </>
  );
}
