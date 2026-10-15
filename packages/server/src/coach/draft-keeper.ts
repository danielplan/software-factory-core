// The setup coach's draft of the company: changed by the coach's tools and
// by the owner on the map, each change shown at once. A product found in
// existing code keeps its folder and what its kit found there (commands,
// port); a new one gets its folder when the factory is made.

import { existsSync } from "node:fs";

import {
  type Detected,
  idFrom,
  type Kit,
  withFreePorts,
} from "@software-factory/core";

import type { ChangeDraft, Draft } from "../api.ts";
import { Refused } from "../refused.ts";

type DraftProduct = Draft["products"][number];
type Users = DraftProduct["users"];

// A product as the coach describes it.
export type ProductIdea = {
  name: string;
  kind: string;
  about: string;
  users?: Users;
  // Existing code: its folder. None: a new product.
  folder?: string;
  dependsOn?: string[];
};

export type ProductChange = {
  id: string;
  name?: string;
  about?: string;
  users?: Users;
  dependsOn?: string[];
};

export class DraftKeeper {
  private kits: Kit[];
  private changed: () => void;
  draft: Draft = { company: { name: "", about: "" }, products: [] };

  constructor(kits: Kit[], changed: () => void) {
    this.kits = kits;
    this.changed = changed;
  }

  setCompany(company: { name?: string; about?: string }): string {
    this.draft = {
      ...this.draft,
      company: {
        name: company.name?.trim() ?? this.draft.company.name,
        about: company.about?.trim() ?? this.draft.company.about,
      },
    };
    this.changed();
    return `The company is now "${this.draft.company.name}".`;
  }

  add(idea: ProductIdea): string {
    const { kit, found } = this.kitFor(idea);
    const id = this.freeId(idea.name);
    const port = found?.port ?? kit.port;
    const product: DraftProduct = {
      id,
      name: idea.name.trim(),
      kind: kit.kind,
      about: idea.about.trim(),
      users: idea.users ?? [],
      folder: idea.folder ?? "",
      isNew: !idea.folder,
      commands: found?.commands ?? {},
      dependsOn: this.known(idea.dependsOn ?? []),
      ...(port ? { port } : {}),
    };
    this.save(withFreePorts([...this.draft.products, product]));
    return `Added ${product.name} as "${id}".`;
  }

  change(change: ProductChange): string {
    const product = this.product(change.id);
    const changed: DraftProduct = {
      ...product,
      ...(change.name?.trim() ? { name: change.name.trim() } : {}),
      ...(change.about === undefined ? {} : { about: change.about.trim() }),
      ...(change.users ? { users: change.users } : {}),
      ...(change.dependsOn
        ? { dependsOn: this.known(change.dependsOn, product.id) }
        : {}),
    };
    this.replace(changed);
    return `Changed ${product.id}.`;
  }

  blueprint(id: string, markdown: string): string {
    this.replace({ ...this.product(id), blueprint: markdown });
    return `Saved the blueprint of ${id}.`;
  }

  remove(id: string): string {
    this.product(id);
    this.save(
      this.draft.products
        .filter((p) => p.id !== id)
        .map((p) => ({ ...p, dependsOn: p.dependsOn.filter((d) => d !== id) })),
    );
    return `Removed ${id}.`;
  }

  // The owner's change on the map.
  owner(change: ChangeDraft): void {
    if ("company" in change) this.setCompany(change.company);
    else if ("product" in change) this.change(change.product);
    else this.remove(change.remove);
  }

  // The draft for the coach to read.
  text(): string {
    return JSON.stringify(this.draft, null, 2);
  }

  // The kit for a product and, for existing code, what it found there.
  private kitFor(idea: ProductIdea): { kit: Kit; found: Detected | null } {
    const kit = this.kits.find((k) => k.kind === idea.kind);
    if (!kit) throw new Refused(`No kit knows a ${idea.kind}.`);
    const folder = idea.folder;
    if (!folder) {
      if (!kit.create)
        throw new Refused(`The ${kit.name} kit cannot make a new one.`);
      return { kit, found: null };
    }
    if (!existsSync(folder)) throw new Refused(`There is no folder ${folder}.`);
    const found = kit.detect(folder);
    if (!found)
      throw new Refused(`The ${kit.name} kit does not recognise ${folder}.`);
    return { kit, found };
  }

  private product(id: string): DraftProduct {
    const product = this.draft.products.find((p) => p.id === id);
    if (!product) throw new Refused(`There is no product "${id}".`);
    return product;
  }

  private replace(product: DraftProduct): void {
    this.save(
      this.draft.products.map((p) => (p.id === product.id ? product : p)),
    );
  }

  private save(products: DraftProduct[]): void {
    this.draft = { ...this.draft, products };
    this.changed();
  }

  // Only products on the map, never the product itself.
  private known(ids: string[], self?: string): string[] {
    const onMap = new Set(this.draft.products.map((p) => p.id));
    const unknown = ids.filter((id) => !onMap.has(id));
    if (unknown.length > 0)
      throw new Refused(`There is no product ${unknown.join(", ")}.`);
    return ids.filter((id) => id !== self);
  }

  private freeId(name: string): string {
    const base = idFrom(name);
    const taken = new Set(this.draft.products.map((p) => p.id));
    let id = base;
    let n = 1;
    while (taken.has(id)) {
      n += 1;
      id = `${base}-${String(n)}`;
    }
    return id;
  }
}
