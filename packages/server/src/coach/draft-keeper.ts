// The setup coach's draft of the project: changed by the coach's tools and
// by the owner on the canvas, each change shown at once. A product found in
// existing code keeps its folder and what its kit found there (commands,
// port); a new one gets its folder when the factory is made. The canvas's
// other things (the cards and installs) follow canvas-things.ts.

import { existsSync } from "node:fs";

import {
  type Detected,
  idFrom,
  type Kit,
  withFreePorts,
} from "@software-factory/core";

import type { ChangeDraft, Draft } from "../api.ts";
import type { Installable } from "../installables.ts";
import { Refused } from "../refused.ts";
import {
  answerInstall,
  type CardIdea,
  connect,
  disconnect,
  focus,
  idsOn,
  move,
  propose,
  removeThing,
  settle,
  withoutPlace,
  writeCard,
} from "./canvas-things.ts";
import { pictureIn } from "./pictures.ts";

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
  // The project's folder, where a card's picture is.
  private project: string;
  readonly installables: Installable[];
  private changed: () => void;
  draft: Draft = {
    company: { name: "", about: "", settled: false },
    products: [],
    things: [],
    links: [],
    places: {},
    focus: { ids: [], areas: [], n: 0 },
  };

  constructor(
    kits: Kit[],
    installables: Installable[],
    changed: () => void,
    project: string,
  ) {
    this.project = project;
    this.kits = kits;
    this.installables = installables;
    this.changed = changed;
  }

  setCompany(company: { name?: string; about?: string }): string {
    this.draft = {
      ...this.draft,
      company: {
        ...this.draft.company,
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
      settled: false,
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
    this.draft = withoutPlace(this.draft, id);
    this.save(
      this.draft.products
        .filter((p) => p.id !== id)
        .map((p) => ({ ...p, dependsOn: p.dependsOn.filter((d) => d !== id) })),
    );
    return `Removed ${id}.`;
  }

  card(idea: CardIdea): string {
    const picture = idea.picture && pictureIn(this.project, idea.picture);
    const made = writeCard(this.draft, {
      ...idea,
      ...(picture ? { picture } : {}),
    });
    this.update(made.draft);
    return idea.id ? `Wrote ${made.id} again.` : `Wrote "${made.id}".`;
  }

  connect(arrow: { from: string; to: string; label?: string }): string {
    const made = connect(this.draft, arrow);
    this.update(made.draft);
    return `Drew "${made.id}".`;
  }

  // Many cards and arrows at once, in order. An arrow's ends are cards
  // already drawn or the keys of cards in this drawing; what does not fit
  // is said and the rest is drawn.
  draw(drawing: {
    cards: (CardIdea & { key?: string })[];
    arrows?: { from: string; to: string; label?: string }[];
  }): string {
    const keys = new Map<string, string>();
    const said = drawing.cards.map(({ key, ...idea }) =>
      this.attempt(() => {
        const answer = this.card(idea);
        const id = idea.id ?? this.draft.things.at(-1)?.id ?? "";
        if (key) keys.set(key, id);
        return key ? `${key}: ${answer}` : answer;
      }),
    );
    for (const arrow of drawing.arrows ?? [])
      said.push(
        this.attempt(() =>
          this.connect({
            ...arrow,
            from: keys.get(arrow.from) ?? arrow.from,
            to: keys.get(arrow.to) ?? arrow.to,
          }),
        ),
      );
    return said.join("\n");
  }

  focus(on: { ids?: string[]; areas?: string[] }): string {
    this.update(focus(this.draft, on));
    return "The owner's canvas now shows it.";
  }

  disconnect(id: string): string {
    this.update(disconnect(this.draft, id));
    return `Took the arrow ${id} off.`;
  }

  settle(ids: string[], settled: boolean): string {
    this.update(settle(this.draft, ids, settled));
    return settled
      ? `${ids.join(", ")} agreed: drawn solid.`
      : `${ids.join(", ")} back to a sketch.`;
  }

  propose(proposal: { what: string; why: string }): string {
    const made = propose(this.draft, this.installables, proposal);
    this.update(made.draft);
    return `Proposed as "${made.id}": the owner approves or declines it on the canvas.`;
  }

  // A product, or a thing, taken off the canvas.
  removeAny(id: string): string {
    if (this.draft.products.some((p) => p.id === id)) return this.remove(id);
    this.update(removeThing(this.draft, id));
    return `Removed ${id}.`;
  }

  // The owner's change on the canvas.
  owner(change: ChangeDraft): void {
    if ("move" in change) this.update(move(this.draft, change.move));
    else if ("install" in change)
      this.update(answerInstall(this.draft, change.install));
    else this.removeAny(change.remove);
  }

  // The draft for the coach to read.
  text(): string {
    return JSON.stringify(this.draft, null, 2);
  }

  // What a change said, or why it was refused.
  private attempt(act: () => string): string {
    try {
      return act();
    } catch (error) {
      if (error instanceof Refused) return `Not drawn: ${error.message}`;
      throw error;
    }
  }

  private update(draft: Draft): void {
    this.draft = draft;
    this.changed();
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

  // Only products on the canvas, never the product itself.
  private known(ids: string[], self?: string): string[] {
    const onMap = new Set(this.draft.products.map((p) => p.id));
    const unknown = ids.filter((id) => !onMap.has(id));
    if (unknown.length > 0)
      throw new Refused(`There is no product ${unknown.join(", ")}.`);
    return ids.filter((id) => id !== self);
  }

  private freeId(name: string): string {
    const base = idFrom(name);
    const taken = idsOn(this.draft);
    let id = base;
    let n = 1;
    while (taken.has(id)) {
      n += 1;
      id = `${base}-${String(n)}`;
    }
    return id;
  }
}
