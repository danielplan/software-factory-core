// The factory's products and kits as the page shows them.

import type { Extension, Factory, Kit } from "@software-factory/core";

import type { KitView, ProductView, TrackerView } from "./api.ts";

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

// The add-ons that track work, as the page offers them.
export function trackerViews(extensions: Extension[]): TrackerView[] {
  return extensions
    .filter((extension) => extension.tracker)
    .map(({ id, name, about }) => ({ id, name, about }));
}
