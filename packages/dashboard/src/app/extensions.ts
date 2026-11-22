// Kobble's extensions on the page, as modules (one folder each under
// src/extensions/), like the server's (server/src/app/modules.ts). The app
// puts together only the installed ones, from the factory's state: a
// removed extension's pages, Home blocks, settings and sidebar rows are not
// mounted at all. The order is the sidebar's: the work from what came in to
// what is built, then the customers.

import type { FactoryState } from "@/api/client";
import { explorations } from "@/extensions/explorations/index";
import { factory } from "@/extensions/factory/index";
import { personas } from "@/extensions/personas/index";
import { releases } from "@/extensions/releases/index";
import { signals } from "@/extensions/signals/index";
import {
  type ExtensionPage,
  type HomeBlocks,
  installedModules,
  type PageModule,
} from "@/lib/page-module";

const MODULES: readonly PageModule[] = [
  signals,
  explorations,
  factory,
  releases,
  personas,
];

export const installedOf = (state: FactoryState): PageModule[] =>
  installedModules(MODULES, state.addOns);

// The pages of the installed extensions.
export const pagesOf = (state: FactoryState): ExtensionPage[] =>
  installedOf(state).flatMap((module) => module.pages);

// The blocks the installed extensions bring to Home, by id.
export const blocksOf =
  (state: FactoryState): HomeBlocks =>
  (read) =>
    Object.assign(
      {},
      ...installedOf(state).map((module) => module.blocks?.(read) ?? {}),
    ) as ReturnType<HomeBlocks>;
