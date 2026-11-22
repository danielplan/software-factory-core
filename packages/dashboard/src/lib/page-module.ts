// What an extension brings to the page, as one module: the page's side of
// the plugs (the server's side is ExtensionModule, server/src/plugs/
// extension.ts). Each of Kobble's extensions is a folder
// src/extensions/<id>/ whose index.tsx exports its module; the app puts
// together only the installed ones, so a removed extension's page code is
// not mounted at all. Extensions never import each other or a core area:
// they plug in here, and the core shows what they bring.

import type { ComponentType, ReactNode } from "react";

import type { FactoryState } from "../api/client.ts";
import type { Messages } from "../i18n/messages.ts";
import type { HomeInput, WaitingItem } from "./home-view.ts";
import type { Page } from "./routes.ts";
import type { SettingsTabName } from "./settings-tabs.ts";

// What a page gets: the factory's state, and what is open in it (an
// exploration, a persona), from the address.
export type PageProps = Readonly<{
  state: FactoryState;
  open: string | null;
}>;

// The sidebar's groups an extension's page can sit in.
export type SidebarGroup = "work" | "customers";

// One page an extension brings, at its own address (#<id>).
export type ExtensionPage = {
  id: Page;
  Page: ComponentType<PageProps>;
  // Its row in the sidebar: the group, its icon on a tint of its colour, and
  // what it counts beside its name (drawn by the extension).
  sidebar: {
    group: SidebarGroup;
    icon: ReactNode;
    color: string;
    Count?: ComponentType<Readonly<{ state: FactoryState }>>;
  };
  // The page fills the whole window, without the sidebar (an exploration
  // that is open).
  fills?: (open: string | null) => boolean;
};

// What Home has read, for the blocks to draw from.
export type HomeRead = {
  state: FactoryState;
  input: HomeInput;
  waiting: WaitingItem[];
};

// The blocks an extension brings to Home, each by its id.
export type HomeBlocks = (read: HomeRead) => Record<string, ReactNode>;

// One section of the settings: its name, its tab and what it shows.
export type SettingsSection = {
  name: string;
  tab: SettingsTabName;
  body: ReactNode;
};

export type PageModule = {
  // The extension's id, as the server names it (factory.json, the
  // Marketplace).
  id: string;
  pages: ExtensionPage[];
  blocks?: HomeBlocks;
  settings?: (words: Messages) => SettingsSection[];
};

// The modules of the installed extensions, in the order given.
export function installedModules(
  modules: readonly PageModule[],
  addOns: FactoryState["addOns"],
): PageModule[] {
  const on = new Set(
    addOns.filter((addOn) => addOn.on).map((addOn) => addOn.id),
  );
  return modules.filter((module) => on.has(module.id));
}
