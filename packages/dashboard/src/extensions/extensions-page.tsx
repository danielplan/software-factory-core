// Variants B and C: the extensions page in the sidebar. B is a marketplace, C a short list with a page for each extension.

import type { FactoryState } from "@/dashboard/dashboard";
import { VARIANT } from "@/lib/prototype-flags";

import { ListPage } from "./list-page";
import { MarketPage } from "./market-page";

export function ExtensionsPage({
  state,
  open,
}: Readonly<{ state: FactoryState; open: string | null }>) {
  return VARIANT === "C" ? (
    <ListPage state={state} open={open} />
  ) : (
    <MarketPage state={state} />
  );
}
