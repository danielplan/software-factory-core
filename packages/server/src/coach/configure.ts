// The setup coach's `configure`: the factory's own settings, written with
// the same steps as the dashboard's (the session's), once the owner said to
// build it. The first call with the project makes the factory's folder;
// products are described (existing code) or made with their kit's starter
// (new); the tracker, add-ons, settings and tools follow. The answer says
// what was done and what the factory's checks still find, so the coach can
// put it right with its own tools.

import { join } from "node:path";

import {
  type Company,
  type Detected,
  type Extension,
  idFrom,
  type Kit,
  withFreePorts,
} from "@software-factory/core";
import { checkKnowledge } from "../knowledge-check.ts";

import type { SetupProduct } from "../api.ts";
import type { Board } from "../connect/board-file.ts";
import type { BoardAsked, TrackerSetup } from "../connect/tracker-setup.ts";
import { trackedWith } from "../add-ons/switch.ts";
import { Refused } from "../refused.ts";
import { themeProblems } from "../theme-check.ts";

export type Configuration = {
  project?: { name: string; about?: string };
  products?: {
    name: string;
    kind: string;
    about: string;
    folder?: string;
    users?: { who: string; does: string }[];
    dependsOn?: string[];
  }[];
  tracker?: string;
  // The board the owner agreed to, for the tracker (tracker-setup.ts).
  board?: BoardAsked;
  addOns?: string[];
  settings?: Record<string, Record<string, string | null>>;
  install?: string[];
};

// What configuring acts on: the factory being made (the session).
export type Workshop = {
  project: string;
  kits: Kit[];
  // The factory's folder, once made.
  root: () => string | null;
  company: () => Company | null;
  makeFolder: (company: { name: string; about: string }) => void;
  saveCompany: (company: Company) => void;
  addProducts: (products: SetupProduct[]) => Promise<void>;
  saveSettings: (
    group: string,
    values: Record<string, unknown>,
  ) => { refused: Record<string, string> };
  // Every extension there is: the add-ons, and those that track work.
  extensions: Extension[];
  install: (ids: string[]) => Promise<boolean>;
  // What the factory's own loading found wrong.
  problems: () => string[];
  // Setting up the trackers' boards, and keeping the one connected.
  trackers: TrackerSetup[];
  connectBoard: (tracker: string, entry: Board[string]) => void;
};

export async function configure(
  shop: Workshop,
  asked: Configuration,
): Promise<string> {
  const said: string[] = [];
  if (asked.project) said.push(project(shop, asked.project));
  const root = shop.root();
  const company = shop.company();
  if (!root || !company)
    throw new Refused(
      "Give the project first: its name makes the factory's folder.",
    );
  said.push(...companyChanges(shop, company, asked));
  if (asked.board) said.push(await connectBoard(shop, asked.board));
  said.push(...settingsChanges(shop, asked.settings ?? {}));
  if (asked.products && asked.products.length > 0) {
    await shop.addProducts(productsOf(shop, asked.products));
    said.push(`Added ${asked.products.map((p) => p.name).join(", ")}.`);
  }
  if (asked.install && asked.install.length > 0)
    said.push(
      (await shop.install(asked.install))
        ? `Installed ${asked.install.join(", ")}.`
        : "Not everything could be installed: the page shows why.",
    );
  return [...said, ...(await checks(shop, root))].join("\n");
}

function project(shop: Workshop, given: { name: string; about?: string }) {
  const company = shop.company();
  const about = given.about?.trim() ?? company?.about ?? "";
  if (!company) {
    shop.makeFolder({ name: given.name, about });
    return "Made the factory's folder (factory/), with its knowledge base.";
  }
  shop.saveCompany({ ...company, name: given.name.trim(), about });
  return "Changed the project.";
}

function companyChanges(
  shop: Workshop,
  company: Company,
  asked: Configuration,
): string[] {
  if (!asked.tracker && !asked.addOns) return [];
  const unknown = (asked.addOns ?? []).filter(
    (id) => !shop.extensions.some((e) => !e.core && e.id === id),
  );
  if (unknown.length > 0)
    throw new Refused(`There is no add-on ${unknown.join(", ")}.`);
  const { tracker } = asked;
  const trackers = shop.extensions.filter((e) => e.tracker).map((e) => e.id);
  if (tracker && tracker !== "none" && !trackers.includes(tracker))
    throw new Refused(
      `No add-on tracks work in ${tracker}: use none or one of ${trackers.join(", ")}.`,
    );
  const added = asked.addOns
    ? { ...company, extensions: asked.addOns }
    : company;
  shop.saveCompany(
    asked.tracker ? trackedWith(added, shop.extensions, asked.tracker) : added,
  );
  return ["Saved where work is tracked and the add-ons."];
}

// Each settings group's values, saved; the refused ones say why.
function settingsChanges(
  shop: Workshop,
  settings: NonNullable<Configuration["settings"]>,
): string[] {
  return Object.entries(settings).map(([group, values]) => {
    const { refused } = shop.saveSettings(group, values);
    const wrong = Object.entries(refused).map(([k, why]) => `${k}: ${why}`);
    return wrong.length > 0
      ? `Settings ${group} not saved: ${wrong.join("; ")}`
      : `Saved the settings ${group}.`;
  });
}

// The board the owner agreed to, connected (or made) for the tracker the
// factory has; what did not work is said, and the owner connects it after
// opening the factory.
async function connectBoard(shop: Workshop, asked: BoardAsked) {
  const tracker = shop.company()?.tracker ?? "none";
  const setup = shop.trackers.find((t) => t.id === tracker);
  if (!setup)
    return `Not connected: set a tracker that can be set up here first (${shop.trackers.map((t) => t.id).join(", ") || "none"}).`;
  try {
    const { entry, said } = await setup.connect(shop.project, asked);
    shop.connectBoard(tracker, entry);
    return said;
  } catch (error) {
    if (!(error instanceof Refused)) throw error;
    return `Not connected: ${error.message} The owner connects it after opening the factory.`;
  }
}

// The products as the factory describes them: existing code where its kit
// recognises it, with what the kit found (commands, port); a new one in a
// folder of its own in the project.
function productsOf(
  shop: Workshop,
  ideas: NonNullable<Configuration["products"]>,
): SetupProduct[] {
  const ids = new Map(ideas.map((idea) => [idea.name, idFrom(idea.name)]));
  return withFreePorts(ideas.map((idea) => productOf(shop, idea, ids)));
}

function productOf(
  shop: Workshop,
  idea: NonNullable<Configuration["products"]>[number],
  ids: Map<string, string>,
): SetupProduct {
  const { kit, found } = kitFor(shop, idea);
  const id = idFrom(idea.name);
  const port = found?.port ?? kit.port;
  return {
    id,
    name: idea.name.trim(),
    kind: kit.kind,
    about: idea.about.trim(),
    folder: idea.folder ?? join(shop.project, id),
    isNew: !idea.folder,
    commands: found?.commands ?? {},
    users: idea.users ?? [],
    dependsOn: (idea.dependsOn ?? []).map((d) => ids.get(d) ?? d),
    ...(port ? { port } : {}),
  };
}

// The product's kit and, for existing code, what it found there.
function kitFor(
  shop: Workshop,
  idea: { kind: string; folder?: string },
): { kit: Kit; found: Detected | null } {
  const kit = shop.kits.find((k) => k.kind === idea.kind);
  if (!kit) throw new Refused(`No kit knows a ${idea.kind}.`);
  if (!idea.folder) return { kit, found: null };
  const found = kit.detect(idea.folder);
  if (!found)
    throw new Refused(`The ${kit.name} kit does not recognise ${idea.folder}.`);
  return { kit, found };
}

// What the factory's checks still find: its own loading, the knowledge
// base's rules, and the theme, if there is one.
async function checks(shop: Workshop, root: string): Promise<string[]> {
  const docs = await checkKnowledge(root);
  const found = [
    ...shop.problems(),
    ...themeProblems(shop.project),
    ...docs.faults,
  ];
  return found.length === 0
    ? ["The factory's checks find nothing wrong."]
    : ["The factory's checks find:", ...found.map((f) => `- ${f}`)];
}
