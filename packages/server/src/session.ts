// The factory this server shows (its products, parts and settings), or its
// setup: the coach plans it with the owner, builds it (coach/configure.ts),
// and the owner opens it, then connects where work is tracked.

import { join } from "node:path";

import {
  type Available,
  type Changes,
  type Claude,
  checkChanges,
  type Company,
  type Factory,
  FACTORY_FOLDER,
  hasFactory,
  loadFactory,
  saveCompany,
  saveGroup,
  type Templates,
} from "@software-factory/core";
import { Launcher } from "@software-factory/launcher";

import type {
  Board,
  ChangeDraft,
  CreateCompany,
  Job,
  SetupProduct,
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
import { makeAndStart } from "./create-products.ts";
import { install } from "./install.ts";
import { addOns, type Installable } from "./installables.ts";
import { Refused, refuseAny } from "./refused.ts";
import { readBoard, saveBoard } from "./connect/board-file.ts";
import { factoryView, kitViews } from "./views.ts";
import { switched } from "./add-ons/switch.ts";
import { writeCompany, writeProducts } from "./write-factory.ts";

export type SessionOptions = {
  // The project: its factory folder opens, or, without one, setup.
  project: string;
  available: Available;
  templates: Templates;
  onChange: () => void;
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
    return {
      mode: "factory",
      project: this.options.project,
      ...factoryView(
        this.factory,
        this.root,
        this.options.available.extensions,
      ),
      parts: this.launcher?.state() ?? [],
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

  // Products the coach adds: their descriptions, then the new ones made
  // with their kits' starters, then they start.
  private async addProducts(products: SetupProduct[]): Promise<void> {
    writeProducts(this.rootOrRefuse(), products, this.options.available.kits);
    this.reload();
    await makeAndStart(products, this.options.available.kits, {
      show: (jobs) => {
        this.showJobs(jobs);
      },
      launcher: () => this.launcher,
    });
  }

  // Where work is tracked, which ends the onboarding: a board connected and
  // checked (board.json, its secrets in settings), or the factory's own.
  chooseBoard(
    tracker: Company["tracker"],
    entry?: Board[string],
    secrets: Changes = {},
  ) {
    const root = this.rootOrRefuse();
    if (Object.keys(secrets).length > 0)
      refuseAny(this.saveSettings(tracker, secrets).refused);
    if (entry) saveBoard(root, { ...readBoard(root), [tracker]: entry });
    this.onboarding = false;
    this.changeCompany((company) => ({ ...company, tracker }));
  }

  // An add-on switched on or off (switch.ts).
  switchAddOn(id: string, on: boolean): void {
    const { extensions } = this.options.available;
    this.changeCompany((company) => switched(company, extensions, id, on));
  }

  // Whether the factory has this add-on on.
  isOn(id: string): boolean {
    return this.factory?.extensions.some((e) => e.id === id) ?? false;
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
      addProducts: (products) => this.addProducts(products),
      saveSettings: (group, values) => this.saveSettings(group, values),
      extensions,
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

  private factoryOrRefuse(): Factory {
    if (!this.factory) throw new Refused("There is no factory open.");
    return this.factory;
  }

  private rootOrRefuse(): string {
    if (!this.root) throw new Refused("Name your company first.");
    return this.root;
  }

  private showJobs(jobs: Job[]): void {
    this.jobs = [...this.earlierJobs, ...jobs];
    this.options.onChange();
  }

  // The company file changed, from what it says now (the owner may have
  // changed it by hand).
  private changeCompany(change: (company: Company) => Company): void {
    this.reload();
    saveCompany(this.rootOrRefuse(), change(this.factoryOrRefuse().company));
    this.reload();
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
