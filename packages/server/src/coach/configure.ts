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
  idFrom,
  type Kit,
  withFreePorts,
} from "@software-factory/core";
import { checkDocs } from "@software-factory/knowledge-base";

import type { SetupProduct } from "../api.ts";
import { Refused } from "../refused.ts";

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
  tracker?: "none" | "github" | "jira";
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
  addOns: string[];
  install: (ids: string[]) => Promise<boolean>;
  // What the factory's own loading found wrong.
  problems: () => string[];
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
  if (asked.settings)
    for (const [group, values] of Object.entries(asked.settings)) {
      const { refused } = shop.saveSettings(group, values);
      const wrong = Object.entries(refused).map(([k, why]) => `${k}: ${why}`);
      said.push(
        wrong.length > 0
          ? `Settings ${group} not saved: ${wrong.join("; ")}`
          : `Saved the settings ${group}.`,
      );
    }
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
    (id) => !shop.addOns.includes(id),
  );
  if (unknown.length > 0)
    throw new Refused(`There is no add-on ${unknown.join(", ")}.`);
  shop.saveCompany({
    ...company,
    ...(asked.tracker ? { tracker: asked.tracker } : {}),
    ...(asked.addOns ? { extensions: asked.addOns } : {}),
  });
  return ["Saved where work is tracked and the add-ons."];
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

// What the factory's checks still find: its own loading, and the knowledge
// base's rules.
async function checks(shop: Workshop, root: string): Promise<string[]> {
  const docs = await checkDocs(join(root, "context"));
  const found = [
    ...shop.problems(),
    ...docs.map((p) => {
      const line = p.line ? ":" + String(p.line) : "";
      return `context/${p.file}${line}: ${p.message}`;
    }),
  ];
  return found.length === 0
    ? ["The factory's checks find nothing wrong."]
    : ["The factory's checks find:", ...found.map((f) => `- ${f}`)];
}
