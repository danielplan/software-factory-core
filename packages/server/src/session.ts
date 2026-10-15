// The factory this server shows: none yet (the setup flow), or one factory
// folder with its products, its parts running through the launcher and its
// settings. Setting up writes the folder, makes the new products with their
// kits' starters, and opens it.

import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  type Available,
  type Claude,
  checkChanges,
  detectProducts,
  type Factory,
  groupView,
  hasFactory,
  loadFactory,
  saveCompany,
  saveGroup,
  type Templates,
  TRACKERS,
} from "@software-factory/core";
import { Launcher } from "@software-factory/launcher";

import type {
  AddProducts,
  ChangeDraft,
  ChooseTracker,
  CreateCompany,
  Job,
  KitView,
  ProductView,
  State,
} from "./api.ts";
import { SetupCoach } from "./coach/setup-coach.ts";
import { createProducts } from "./create-products.ts";
import { Refused } from "./refused.ts";
import { writeCompany, writeProducts } from "./write-factory.ts";

export type SessionOptions = {
  // The factory folder to open; none, or one without a factory: setup.
  root: string | null;
  factoriesFolder: string;
  available: Available;
  templates: Templates;
  onChange: () => void;
  // The setup coach's Claude Code and its instructions.
  coach: { claude: Claude; guide: string; home?: string };
};

export class Session {
  private options: SessionOptions;
  private root: string | null = null;
  private factory: Factory | null = null;
  private launcher: Launcher | null = null;
  private stopListening: (() => void) | null = null;
  private jobs: Job[] = [];
  readonly coach: SetupCoach;

  constructor(options: SessionOptions) {
    this.options = options;
    this.coach = new SetupCoach({
      ...options.coach,
      kits: options.available.kits,
      onChange: options.onChange,
    });
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
        coach: this.coach.view(),
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

  // The first step: the company and its factory folder, which opens with
  // no products yet.
  createCompany(request: CreateCompany): string {
    if (this.root) throw new Refused("This factory has its company already.");
    const root = writeCompany(request, this.place());
    this.open(root);
    return root;
  }

  // The setup coach's map made into the factory: the company, then its
  // products (new ones in the factory's code folder).
  async makeFromDraft(): Promise<void> {
    const { company, products } = this.coach.keeper.draft;
    if (this.coach.view().working)
      throw new Refused("Wait until the coach has answered.");
    const root = this.createCompany(company);
    if (products.length === 0) return;
    await this.addProducts({
      products: products.map((product) =>
        product.isNew
          ? { ...product, folder: join(root, "code", product.id) }
          : product,
      ),
    });
  }

  ownerChangesDraft(change: ChangeDraft): void {
    if (this.root) throw new Refused("The factory is made already.");
    this.coach.ownerChange(() => {
      this.coach.keeper.owner(change);
    });
  }

  // Products added on the Products tab: their descriptions, then the new
  // ones made with their kits' starters, then they start.
  async addProducts(request: AddProducts): Promise<void> {
    const root = this.rootOrRefuse();
    writeProducts(root, request.products, this.options.available.kits);
    this.reload();
    const made = await createProducts(
      request.products.filter((p) => p.isNew),
      this.options.available.kits,
      (jobs) => {
        this.jobs = jobs;
        this.options.onChange();
      },
    );
    const launcher = this.launcher;
    if (!made || !launcher) return;
    // The new products that run (a kit may make no part for one).
    const parts = new Set(launcher.state().map((part) => part.id));
    const starting = request.products.filter((p) => parts.has(p.id));
    await Promise.allSettled(starting.map((p) => launcher.start(p.id)));
  }

  // Where work is tracked, with that tracker's settings.
  chooseTracker(request: ChooseTracker) {
    const root = this.rootOrRefuse();
    if (!this.factory) throw new Refused("There is no factory open.");
    if (!TRACKERS.includes(request.tracker))
      throw new Refused("Choose where work is tracked.");
    const group = this.factory.settings.find((g) => g.id === request.tracker);
    const { changes, refused } = group
      ? checkChanges(group, request.settings ?? {})
      : { changes: {}, refused: {} };
    if (Object.keys(refused).length > 0) return { refused };
    if (group) saveGroup(group, root, changes);
    saveCompany(root, { ...this.factory.company, tracker: request.tracker });
    this.reload();
    return { refused };
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

  private rootOrRefuse(): string {
    if (!this.root) throw new Refused("Name your company first.");
    return this.root;
  }

  private place() {
    return {
      factoriesFolder: this.options.factoriesFolder,
      kits: this.options.available.kits,
      templates: this.options.templates,
    };
  }

  // The factory's files changed: read again; what runs keeps running.
  private reload(): void {
    const root = this.rootOrRefuse();
    const loaded = loadFactory(root, this.options.available);
    if ("problem" in loaded) throw new Refused(loaded.problem);
    this.factory = loaded;
    this.launcher?.setParts(loaded.parts);
    this.options.onChange();
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
