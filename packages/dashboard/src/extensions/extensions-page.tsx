// The extensions page in the sidebar: the marketplace.

import type { FactoryState } from "@/dashboard/dashboard";

import { MarketPage } from "./market-page";

export function ExtensionsPage({
  state,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  return <MarketPage state={state} />;
}
