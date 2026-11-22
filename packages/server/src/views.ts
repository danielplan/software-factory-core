// The factory as the page shows it: its products, kits and add-ons.

import {
  type Extension,
  type Factory,
  groupView,
  type Kit,
  shownView,
  slotsOf,
} from "@software-factory/core";

import type { KitView, ProductView, State } from "./api.ts";
import { readBoard } from "./connect/board-file.ts";
import { stagesView } from "./stages.ts";

// What the page shows of an open factory, from its files.
export function factoryView(
  factory: Factory,
  root: string,
  extensions: Extension[],
): Pick<
  Extract<State, { mode: "factory" }>,
  | "root"
  | "company"
  | "products"
  | "settings"
  | "problems"
  | "board"
  | "addOns"
  | "stages"
  | "slots"
> {
  return {
    root,
    company: factory.company,
    products: factory.products.map(productView),
    settings: factory.settings.map((group) => groupView(group, root)),
    problems: factory.problems,
    board: readBoard(root),
    addOns: extensions.map((extension) => ({
      id: extension.id,
      name: extension.name,
      about: extension.about,
      builtIn: extension.core,
      on: factory.extensions.some((e) => e.id === extension.id),
      tracker: extension.tracker,
      always: extension.always,
      needs: extension.needs,
      slots: extension.slots,
      brings: extension.brings,
      screens: {
        pages: extension.pages.map(shownView),
        blocks: extension.blocks.map(shownView),
        stages: extension.stages.map(({ id, name }) => ({ id, name })),
      },
      settings: extension.settings.map((group) => group.id),
    })),
    stages: stagesOf(factory, root),
    slots: slotsOf(extensions, factory.company),
  };
}

// The stages of the installed extensions in the team's order, and the
// clash left open between two of them, by id.
function stagesOf(factory: Factory, root: string) {
  const { order, clash } = stagesView(root, factory.extensions);
  return {
    order,
    clash: clash && { first: clash.first.id, second: clash.second.id },
  };
}

export function kitViews(kits: Kit[]): KitView[] {
  return kits.map((kit) => ({
    id: kit.id,
    name: kit.name,
    about: kit.about,
    kind: kit.kind,
    canCreate: kit.create !== null,
    madeBy: "kobble",
    brings: [
      ...(kit.rules.length > 0 ? (["rules"] as const) : []),
      ...(kit.starter ? (["starter"] as const) : []),
      ...(Object.keys(kit.commands).length > 0 ? (["checks"] as const) : []),
      ...(Object.keys(kit.mcp).length > 0 ? (["tools"] as const) : []),
    ],
  }));
}

function productView(product: Factory["products"][number]): ProductView {
  return {
    id: product.id,
    name: product.name,
    kind: product.kind,
    kit: product.kit,
    about: product.about,
    folder: product.folder,
    port: product.port ?? null,
    commands: Object.fromEntries(
      Object.entries(product.commands).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    users: product.users,
  };
}
