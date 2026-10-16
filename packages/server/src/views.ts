// The factory's products and kits as the page shows them.

import type { Factory, Kit } from "@software-factory/core";

import type { KitView, ProductView } from "./api.ts";

export function kitViews(kits: Kit[]): KitView[] {
  return kits.map((kit) => ({
    id: kit.id,
    name: kit.name,
    about: kit.about,
    kind: kit.kind,
    canCreate: kit.create !== null,
  }));
}

export function productView(product: Factory["products"][number]): ProductView {
  return {
    id: product.id,
    name: product.name,
    kind: product.kind,
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
