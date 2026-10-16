// The factory this server shows (its products, parts and settings), or its
// setup: the coach plans it with the owner, builds it (coach/configure.ts),
// and the owner opens it, then connects where work is tracked.

import { join } from "node:path";

import {
  type Available,
  type Claude,
  checkChanges,
  type Factory,
  FACTORY_FOLDER,
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
  State,
} from "./api.ts";
import {
  type Configuration,
  configure,
  type Workshop,
} from "./coach/configure.ts";
import { Ideas } from "./coach/ideas.ts";
import { pictureIn, shownPicture } from "./coach/pictures.ts";
import { SetupCoach } from "./coach/setup-coach.ts";
import type { ToolsFor } from "./coach/setup-tools.ts";
import { createProducts } from "./create-products.ts";
import { install } from "./install.ts";
import { addOns, type Installable } from "./installables.ts";
import { Refused } from "./refused.ts";
import { kitViews, productView } from "./views.ts";
import { writeCompany, writeProducts } from "./write-factory.ts";

export type SessionOptions = {
  // The project: its factory folder opens, or, without one, setup.
  project: string;
  available: Available;
  templates: Templates;
  onChange: () => void;
  // The setup coach's Claude Code and its instructions.
  // The setup coach's and the idea coach's instructions.
  coach: { claude: Claude; guide: string; ideaGuide: string };
  // The tools on this computer the coach may install, once the owner
  // agreed (installables.ts: computerTools).
  tools: Installable[];
};

export class Session {
  private options: SessionOptions;
  private root: string | null = null;
  private factory: Factory | null = null;
  private launcher: Launcher | null = null;
  private stopListening: (() => void) | null = null;
  private jobs: Job[] = [];
  // Jobs finished before the ones running now, still shown.
  private earlierJobs: Job[] = [];
  readonly coach: SetupCoach;
  // The factory's ideas, once it is open.
  private ideas: Ideas | null = null;
  // Where the server answers the coaches' tools.
  private toolsBase = "";
  // Just set up: connecting the tools comes first.
  private onboarding = false;

  constructor(options: SessionOptions) {
    this.options = options;
    this.coach = new SetupCoach({
      ...options.coach,
      project: options.project,
      kits: options.available.kits,
      installables: [...options.tools, ...addOns(options.available.extensions)],
      onChange: options.onChange,
      made: () => this.root !== null,
    });
    const root = join(options.project, FACTORY_FOLDER);
    if (hasFactory(root)) this.open(root);
  }

  // Once the server listens: without a factory, the coach starts reading
  // the project's code.
  begin(): void {
    if (!this.root) void this.coach.begin();
  }

  state(): State {
    const kits = kitViews(this.options.available.kits);
    if (!this.root || !this.factory || this.coach.building())
      return {
        mode: "setup",
        project: this.options.project,
        kits,
        jobs: this.jobs,
        coach: this.coach.view(),
      };
    const root = this.root;
    return {
      mode: "factory",
      project: this.options.project,
      root,
      company: this.factory.company,
      products: this.factory.products.map(productView),
      parts: this.launcher?.state() ?? [],
      settings: this.factory.settings.map((group) => groupView(group, root)),
      problems: this.factory.problems,
      kits,
      jobs: this.jobs,
      ideas: this.ideas?.list() ?? [],
      onboarding: this.onboarding,
    };
  }

  // The first step: the project's factory folder, which opens with no
  // products yet.
  createCompany(request: CreateCompany): string {
    if (this.root) throw new Refused("This factory has its company already.");
    const root = writeCompany(
      request,
      this.options.project,
      this.options.templates,
    );
    this.open(root);
    return root;
  }

  // The coach's tools: its map, and the factory's settings once building.
  coachTools(): ToolsFor {
    return {
      token: this.coach.token,
      draw: (drawing) =>
        this.coach.draw(drawing, (path) =>
          pictureIn(this.options.project, path),
        ),
      configure: (asked: Configuration) => {
        if (!this.coach.building())
          throw new Refused(
            "Plan with the owner first: build once they say so.",
          );
        return configure(this.workshop(), asked);
      },
    };
  }

  // The owner says to build the factory as planned.
  async build(): Promise<void> {
    if (this.root && !this.coach.building())
      throw new Refused("The factory is made already.");
    await this.coach.build();
  }

  // The owner opens the factory the coach made: setup is over.
  openFactory(): void {
    if (!this.root) throw new Refused("There is no factory yet.");
    this.coach.finish();
    this.onboarding = true;
    this.reload();
  }

  // The owner connects later (or has connected): the onboarding goes.
  connectLater(): void {
    this.onboarding = false;
    this.options.onChange();
  }

  // A tool on this computer, installed with the system's package manager.
  async installTool(id: string): Promise<{ installed: boolean }> {
    if (!this.coach.installables.some((i) => i.id === id))
      throw new Refused(`The factory cannot install ${id}.`);
    return { installed: await this.installAll([id]) };
  }

  // Where the server answers the coaches' tools, once it listens.
  serveToolsAt(base: string): void {
    this.toolsBase = base;
    this.coach.serveToolsAt(`${base}/setup/mcp`);
    this.ideas?.serveToolsAt(`${base}/ideas/mcp`);
  }

  // The file of a picture a card shows, on the setup map or an idea's
  // (pictures.ts); none for any other path.
  picture(path: string): string | null {
    if (this.inSetup())
      return shownPicture(this.options.project, this.coach.map, path);
    return this.ideas?.shows(path) ? join(this.options.project, path) : null;
  }

  // An idea's tools: only its map.
  ideaTools(id: string): ToolsFor {
    const ideas = this.ideasOrRefuse();
    return {
      token: ideas.token(id),
      titled: true,
      draw: (drawing) =>
        ideas.draw(id, drawing, (path) =>
          pictureIn(this.options.project, path),
        ),
    };
  }

  ideasOrRefuse(): Ideas {
    if (!this.ideas) throw new Refused("There is no factory open.");
    return this.ideas;
  }

  ownerChangesDraft(change: ChangeDraft): void {
    if (!this.inSetup()) throw new Refused("The factory is made already.");
    this.coach.ownerChange(change);
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
        this.showJobs(jobs);
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
    this.ideas = new Ideas({
      claude: this.options.coach.claude,
      root,
      project: this.options.project,
      guide: this.options.coach.ideaGuide,
      onChange: this.options.onChange,
    });
    if (this.toolsBase) this.ideas.serveToolsAt(`${this.toolsBase}/ideas/mcp`);
    this.stopListening = this.launcher.subscribe(this.options.onChange);
    this.options.onChange();
  }

  private inSetup(): boolean {
    return !this.root || this.coach.building();
  }

  // What the coach's configure acts on: this factory, as it is made.
  private workshop(): Workshop {
    const { kits, extensions } = this.options.available;
    return {
      project: this.options.project,
      kits,
      root: () => this.root,
      company: () => this.factory?.company ?? null,
      makeFolder: (company) => {
        this.createCompany(company);
      },
      saveCompany: (company) => {
        saveCompany(this.rootOrRefuse(), company);
        this.reload();
      },
      addProducts: (products) => this.addProducts({ products }),
      saveSettings: (group, values) => this.saveSettings(group, values),
      addOns: addOns(extensions).map((a) => a.id),
      install: (ids) => this.installAll(ids),
      problems: () => this.factory?.problems ?? [],
    };
  }

  // What the factory can install, by id; its jobs stay shown beside what
  // comes next.
  private async installAll(ids: string[]): Promise<boolean> {
    const done = await install(
      this.rootOrRefuse(),
      this.coach.installables.filter((i) => ids.includes(i.id)),
      (jobs) => {
        this.showJobs(jobs);
      },
    );
    this.earlierJobs = this.jobs;
    this.reload();
    return done;
  }

  private rootOrRefuse(): string {
    if (!this.root) throw new Refused("Name your company first.");
    return this.root;
  }

  private showJobs(jobs: Job[]): void {
    this.jobs = [...this.earlierJobs, ...jobs];
    this.options.onChange();
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
}
