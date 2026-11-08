// The factory as the page shows it: its products, kits and add-ons.

import {
  type Extension,
  type Factory,
  groupView,
  type Kit,
} from "@software-factory/core";

import type { KitView, ProductView, State } from "./api.ts";
import { readBoard } from "./connect/board-file.ts";

// What the page shows of an open factory, from its files.
export function factoryView(
  factory: Factory,
  root: string,
  extensions: Extension[],
): Pick<
  Extract<State, { mode: "factory" }>,
  "root" | "company" | "products" | "settings" | "problems" | "board" | "addOns"
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
      settings: extension.settings.map((group) => group.id),
    })),
  };
}

export function kitViews(kits: Kit[]): KitView[] {
  return kits.map((kit) => ({
    id: kit.id,
    name: kit.name,
    about: kit.about,
    kind: kit.kind,
    canCreate: kit.create !== null,
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
