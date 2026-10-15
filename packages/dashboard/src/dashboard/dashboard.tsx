import { useEffect, useState } from "react";

import type { State } from "@/api";
import { ProblemBox } from "@/components/problem-box";
import { cn } from "@/lib/utils";

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

export function Dashboard({ state }: Readonly<{ state: FactoryState }>) {
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
  return (
    <div className="grid gap-5">
      <nav className="flex gap-1 border-b" aria-label="Tabs">
        {TABS.map((name) => (
          <a
            key={name}
            href={`#${name}`}
            aria-current={tab === name ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground",
              tab === name && "border-primary text-foreground",
            )}
          >
            {NAMES[name]}
          </a>
        ))}
      </nav>
      {state.problems.length > 0 && (
        <ProblemBox
          title="Something in the factory's files does not fit"
          text={state.problems.join(" · ")}
        />
      )}
      {tab === "system" && <SystemTab state={state} />}
      {tab === "products" && <ProductsTab state={state} />}
      {tab === "settings" && <SettingsTab state={state} />}
    </div>
  );
}
