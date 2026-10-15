// The factory this server shows: none yet (the setup flow), or one factory
// folder with its products, its parts running through the launcher and its
// settings. Setting up writes the folder, makes the new products with their
// kits' starters, and opens it.

import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  type Available,
  checkChanges,
  type Company,
  detectProducts,
  type Factory,
  groupView,
  hasFactory,
  loadFactory,
  saveGroup,
  type Templates,
} from "@software-factory/core";
import { Launcher } from "@software-factory/launcher";

import type { FinishSetup, Job, KitView, ProductView, State } from "./api.ts";
import { createProducts } from "./create-products.ts";
import { Refused } from "./refused.ts";
import { writeFactory } from "./write-factory.ts";

export type SessionOptions = {
  // The factory folder to open; none, or one without a factory: setup.
  root: string | null;
  factoriesFolder: string;
  available: Available;
  templates: Templates;
  onChange: () => void;
};

export class Session {
  private options: SessionOptions;
  private root: string | null = null;
  private factory: Factory | null = null;
  private launcher: Launcher | null = null;
  private stopListening: (() => void) | null = null;
  private jobs: Job[] = [];

  constructor(options: SessionOptions) {
    this.options = options;
    if (options.root && hasFactory(options.root)) this.open(options.root);
  }

  state(): State {
    const kits = this.kits();
    if (!this.root || !this.factory)
      return {
        mode: "setup",
        factoriesFolder: this.options.factoriesFolder,
        kits,
        jobs: this.jobs,
      };
    const root = this.root;
    return {
      mode: "factory",
      root,
      company: this.factory.company,
      products: this.factory.products.map(productView),
      parts: this.launcher?.state() ?? [],
      settings: this.factory.settings.map((group) => groupView(group, root)),
      problems: this.factory.problems,
      kits,
      jobs: this.jobs,
    };
  }

  detect(folder: string) {
    if (!existsSync(folder)) throw new Refused(`There is no folder ${folder}.`);
    return { candidates: detectProducts(folder, this.options.available.kits) };
  }

  // Writes the factory folder, makes the new products, then opens it and
  // starts what starts by itself.
  async finish(request: FinishSetup): Promise<string> {
    if (this.root) throw new Refused("This factory is set up already.");
    const root = writeFactory(request, {
      factoriesFolder: this.options.factoriesFolder,
      kits: this.options.available.kits,
      templates: this.options.templates,
    });
    this.saveTracker(root, request);
    const made = await createProducts(
      request.products.filter((p) => p.isNew),
      this.options.available.kits,
      (jobs) => {
        this.jobs = jobs;
        this.options.onChange();
      },
    );
    this.open(root);
    if (made) await this.launcher?.startAll();
    return root;
  }

  // A settings group's new values; the refused ones say why.
  saveSettings(id: string, values: Record<string, unknown>) {
    const group = this.factory?.settings.find((g) => g.id === id);
    if (!this.root || !group) throw new Refused("There is no such setting.");
    const { changes, refused } = checkChanges(group, values);
    if (Object.keys(refused).length === 0) saveGroup(group, this.root, changes);
    this.options.onChange();
    return { refused };
  }

  launcherOrRefuse(): Launcher {
    if (!this.launcher) throw new Refused("There is no factory open.");
    return this.launcher;
  }

  close(): void {
    this.stopListening?.();
    this.launcher?.stopNow();
    this.launcher?.close();
  }

  private open(root: string): void {
    const loaded = loadFactory(root, this.options.available);
    if ("problem" in loaded) throw new Refused(loaded.problem);
    this.close();
    this.root = root;
    this.factory = loaded;
    this.launcher = new Launcher({ root, parts: loaded.parts });
    this.stopListening = this.launcher.subscribe(this.options.onChange);
    this.options.onChange();
  }

  private saveTracker(root: string, request: FinishSetup): void {
    const tracker: Company["tracker"] = request.company.tracker;
    const group = this.options.available.extensions
      .flatMap((extension) => extension.settings)
      .find((g) => g.id === tracker);
    if (!group || !request.settings) return;
    const { changes } = checkChanges(group, request.settings);
    saveGroup(group, root, changes);
  }

  private kits(): KitView[] {
    return this.options.available.kits.map((kit) => ({
      id: kit.id,
      name: kit.name,
      about: kit.about,
      kind: kit.kind,
      canCreate: kit.create !== null,
    }));
  }
}

function productView(product: Factory["products"][number]): ProductView {
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

export const defaultFactoriesFolder = (home: string) => join(home, "Factories");
